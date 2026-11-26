import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomBytes } from "node:crypto";

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NewNote {
  title: string;
  content?: string;
  tags?: string[];
}

export type NotePatch = Partial<NewNote>;

/**
 * Contrato del almacenamiento. Hay dos implementaciones:
 * - DynamoNotesRepo: la real, en AWS.
 * - MemoryNotesRepo: para desarrollo local y tests, sin cuenta de AWS.
 */
export interface NotesRepo {
  create(userId: string, input: NewNote): Promise<Note>;
  list(userId: string): Promise<Note[]>;
  get(userId: string, id: string): Promise<Note | undefined>;
  update(userId: string, id: string, patch: NotePatch): Promise<Note | undefined>;
  remove(userId: string, id: string): Promise<boolean>;
}

/** Id ordenable por fecha: 8 caracteres de timestamp en base 36 + 4 aleatorios. */
export const newId = () =>
  Date.now().toString(36).padStart(8, "0") + randomBytes(3).toString("hex").slice(0, 4);

const now = () => new Date().toISOString();

// ── DynamoDB: una sola tabla, PK = USER#<userId>, SK = NOTE#<id> ────────────

export class DynamoNotesRepo implements NotesRepo {
  private readonly ddb: DynamoDBDocumentClient;

  constructor(
    private readonly tableName: string,
    client = new DynamoDBClient({}),
  ) {
    this.ddb = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  private key(userId: string, id: string) {
    return { PK: `USER#${userId}`, SK: `NOTE#${id}` };
  }

  async create(userId: string, input: NewNote): Promise<Note> {
    const ts = now();
    const note: Note = {
      id: newId(),
      title: input.title,
      content: input.content ?? "",
      tags: input.tags ?? [],
      createdAt: ts,
      updatedAt: ts,
    };
    await this.ddb.send(
      new PutCommand({ TableName: this.tableName, Item: { ...this.key(userId, note.id), ...note } }),
    );
    return note;
  }

  async list(userId: string): Promise<Note[]> {
    const r = await this.ddb.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":sk": "NOTE#" },
        ScanIndexForward: false, // más recientes primero
        Limit: 100,
      }),
    );
    return (r.Items ?? []).map(toNote);
  }

  async get(userId: string, id: string): Promise<Note | undefined> {
    const r = await this.ddb.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND SK = :sk",
        ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":sk": `NOTE#${id}` },
      }),
    );
    return r.Items?.[0] ? toNote(r.Items[0]) : undefined;
  }

  async update(userId: string, id: string, patch: NotePatch): Promise<Note | undefined> {
    const sets: string[] = ["updatedAt = :updatedAt"];
    const values: Record<string, unknown> = { ":updatedAt": now() };
    const names: Record<string, string> = {};
    for (const field of ["title", "content", "tags"] as const) {
      if (patch[field] !== undefined) {
        sets.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = patch[field];
      }
    }
    try {
      const r = await this.ddb.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: this.key(userId, id),
          UpdateExpression: `SET ${sets.join(", ")}`,
          ConditionExpression: "attribute_exists(PK)", // no crear notes al actualizar
          ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        }),
      );
      return r.Attributes ? toNote(r.Attributes) : undefined;
    } catch (err) {
      if ((err as Error).name === "ConditionalCheckFailedException") return undefined;
      throw err;
    }
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const r = await this.ddb.send(
      new DeleteCommand({ TableName: this.tableName, Key: this.key(userId, id), ReturnValues: "ALL_OLD" }),
    );
    return Boolean(r.Attributes);
  }
}

function toNote(item: Record<string, any>): Note {
  return {
    id: item.id,
    title: item.title,
    content: item.content ?? "",
    tags: item.tags ?? [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt ?? item.createdAt,
  };
}

// ── En memoria: desarrollo local sin AWS y tests ───────────────────────────

export class MemoryNotesRepo implements NotesRepo {
  private readonly data = new Map<string, Map<string, Note>>();

  private bucket(userId: string) {
    let b = this.data.get(userId);
    if (!b) this.data.set(userId, (b = new Map()));
    return b;
  }

  async create(userId: string, input: NewNote): Promise<Note> {
    const ts = now();
    const note: Note = {
      id: newId(),
      title: input.title,
      content: input.content ?? "",
      tags: input.tags ?? [],
      createdAt: ts,
      updatedAt: ts,
    };
    this.bucket(userId).set(note.id, note);
    return note;
  }

  async list(userId: string): Promise<Note[]> {
    return [...this.bucket(userId).values()].sort((a, b) => b.id.localeCompare(a.id));
  }

  async get(userId: string, id: string) {
    return this.bucket(userId).get(id);
  }

  async update(userId: string, id: string, patch: NotePatch) {
    const current = this.bucket(userId).get(id);
    if (!current) return undefined;
    const next: Note = {
      ...current,
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      updatedAt: now(),
    };
    this.bucket(userId).set(id, next);
    return next;
  }

  async remove(userId: string, id: string) {
    return this.bucket(userId).delete(id);
  }
}

/** Con TABLE_NAME usa DynamoDB; sin él, memoria (y lo avisa). */
export function createRepo(env = process.env): NotesRepo {
  if (env.TABLE_NAME) return new DynamoNotesRepo(env.TABLE_NAME);
  console.warn("[studynotes] TABLE_NAME no está definida: usando almacenamiento en memoria.");
  return new MemoryNotesRepo();
}
