# 02 · Tu primer deploy

```
Quiero desplegar StudyNotes en mi cuenta de AWS. Sigue AGENTS.md.

1. Corre `node scripts/doctor.mjs --json`. Si hay "fail", detente y ayúdame a resolverlo.
2. Corre `npm run check`. Si falla, arréglalo y explícame qué pasaba.
3. Corre `npm run diff` y explícame en lenguaje simple:
   - qué recursos se van a crear y para qué sirve cada uno,
   - qué queda público en internet,
   - qué permisos IAM se crean,
   - cuánto podría costar al mes con poco tráfico y qué topes de costo tiene (maxEnvironments, rateLimit),
   - cómo lo borro después.
4. Espera mi aprobación explícita. No despliegues sin ella.
5. Con mi aprobación, corre `npm run deploy` y muéstrame la URL de salida (Url).
6. Prueba `GET <Url>/api/health` y crea una nota con curl. Dime cómo verla en la consola de DynamoDB.
```

## Lo que se crea

| Recurso | Para qué |
|---|---|
| `AWS::Lambda::WebFunction` + revisión + endpoint `prod` | Tu servidor HTTP con URL HTTPS propia |
| Tabla DynamoDB on-demand | Tus notas |
| Bucket S3 administrado por CDK | Guarda el `.zip` de tu código (versionado, privado) |
| Rol IAM | Permisos de la función: logs + solo tu tabla |
| Log group (7 días) | Logs de la app |
