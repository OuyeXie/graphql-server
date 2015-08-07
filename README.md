# graphql-server

GraphQL server with and Node.js

**Example GraphQL query:**
```
user(id: "1") {
  name
  friends {
    name
  }
}
```

**Example response:**
```json
{
  "data": {
    "user": {
      "name": "John Doe",
      "friends": [
        {
          "name": "Friend One"
        },
        {
          "name": "Friend Two"
        }]
      }
    }
  }
```

**Example GraphQL mutation:**
```
mutation updateUser($userId: String! $name: String!) {
  updateUser(id: $userId name: $name) {
    name
  }
}
```

## Used technologies

* GraphQL
* Node/IO.js
* Babel

## How to start

You need `iojs` or >= `Node.js` v0.12.x

### install dependencies

```
npm install
```

### seed database
```
npm run seed
```

### start server
```
npm start
```

### run client
```
npm run client
```

## How to test

```
npm test
```
