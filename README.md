# API de productos: Express, SQLite y JWT

API para el taller individual. Guarda productos en una base SQLite persistente; no usa arreglos ni archivos JSON como almacenamiento. El único endpoint público es el inicio de sesión.

## Requisitos y preparación

- Node.js 20 o superior y npm.
- Postman.
- DB Browser for SQLite u otro cliente compatible con SQLite para inspeccionar `data/workshop.sqlite`.

En PowerShell, desde la carpeta del proyecto:

```powershell
npm install
Copy-Item .env.example .env
```

Edita `.env`: reemplaza `JWT_SECRET` por una cadena aleatoria de al menos 32 caracteres y cambia `INITIAL_PASSWORD` por una contraseña de prueba de al menos 8 caracteres. No compartas ni entregues `.env`; está excluido de Git. La contraseña inicial se almacena como hash bcrypt.

Inicializa la base de datos y la cuenta de prueba, y luego inicia el servidor:

```powershell
npm run db:init
npm start
```

El servidor queda en `http://localhost:3000`. La base se crea en `data/workshop.sqlite` y conserva los datos al reiniciar el servidor. Para revisar la evidencia, abre ese archivo desde DB Browser for SQLite y consulta la tabla `products`.

## Rutas

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| POST | `/auth/login` | Público | Valida credenciales y entrega JWT con vencimiento. |
| POST | `/products` | JWT | Crea un producto; responde 201. |
| GET | `/products` | JWT | Devuelve la lista; responde 200. |
| GET | `/products?favorite=true` | JWT | Devuelve solo los productos favoritos. Usa `favorite=false` para los demás. |
| GET | `/products/:id` | JWT | Devuelve un producto o 404. |
| PUT | `/products/:id` | JWT | Actualiza uno o más campos o responde 404. |
| DELETE | `/products/:id` | JWT | Elimina; responde 204 o 404. |

Los campos editables son `name` (texto obligatorio al crear), `description` (texto opcional), `price` (número obligatorio, mayor o igual a cero) e `is_favorite` (booleano, opcional y falso por defecto). Para marcar un favorito al crear o actualizar, envía `"is_favorite": true`; filtra los favoritos con `GET /products?favorite=true`. En Postman, para las rutas de productos selecciona **Authorization > Bearer Token** y pega el token obtenido en el login.

## Prueba rápida en Postman

1. Envía `POST http://localhost:3000/auth/login` con **Body > raw > JSON**:

```json
{
  "username": "docente",
  "password": "la contraseña configurada en .env"
}
```

2. Copia `token` de la respuesta y úsalo como Bearer Token.
3. Envía `POST http://localhost:3000/products` con este cuerpo:

```json
{
  "name": "Cuaderno",
  "description": "Tapa dura",
  "price": 4.5
}
```

4. Prueba `GET /products`, `GET /products/1`, `PUT /products/1` con `{"price":5}` y `DELETE /products/1`. Usa el identificador que devolvió la creación.
5. Inspecciona la tabla `products` en el cliente SQLite después de crear y actualizar. Reinicia el servidor y vuelve a consultar para demostrar persistencia; después de borrar, la consulta por ID devuelve 404.

Sin token, con token inválido o vencido, las rutas CRUD responden 401 y no modifican datos. Los cuerpos incompletos o inválidos responden 400. El login no revela si falló el usuario o la contraseña.

## Pruebas automatizadas

```powershell
npm test
```

Las pruebas usan una base temporal separada de la base de trabajo y verifican login, protección JWT, validación, operaciones CRUD y persistencia directa en SQLite.