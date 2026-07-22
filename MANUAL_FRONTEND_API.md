# 📘 Manual de Integração Frontend - API Entregas

## 📋 Sumário
- [Configuração de Environment](#configuração-de-environment)
- [Autenticação](#autenticação)
- [Controller Authentication](#controller-authentication)
- [Controller Usuarios](#controller-usuarios)
- [Controller Motoboys](#controller-motoboys)
- [Controller Entregas](#controller-entregas)
- [Endpoints MASTER (Acesso Restrito)](#endpoints-master-acesso-restrito)

---

## 🔧 Configuração de Environment

### Arquivo `.env` no Frontend

```env
# URL da API Backend (NÃO alterar, é fixo)
VITE_API_URL=http://localhost:8080

# Título do Aplicativo (opcional)
VITE_APP_TITLE=Sistema de Gestão de Entregas
```

**Portas:**
- **Backend API:** `8080` (fixa, Spring Boot padrão)
- **Frontend Development:** `5173` ou `3000` (permitido pelo CORS)

### Configuração de Axios/Fetch

```javascript
// api/config.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injetar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config.config;
});
```

---

## 🔐 Autenticação

### Como Funciona

A API utiliza **JWT (JSON Web Token)** para autenticação:

1. **Login:** O frontend envia email e senha → API valida → retorna token JWT
2. **Storage:** Armazene o token no `localStorage` com a chave `'token'`
3. **Requisições:** Envie o token no header: `Authorization: Bearer {token}`
4. **Nome do Usuário Logado:** `/api/usuarios/me` retorna os dados do usuário atual

### Fluxo de Autenticação

```javascript
// Exemplo: Login
const login = async (email, password) => {
  const response = await api.post('/api/auth/login', {
    email,
    password
  });

  // Armazenar token
  localStorage.setItem('token', response.data.token);

  // Buscar dados do usuário
  const userResponse = await api.get('/api/usuarios/me');
  localStorage.setItem('user', JSON.stringify(userResponse.data));

  return userResponse.data;
};

// Exemplo: Logout
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Redirecionar para login
};
```

### Pegar Nome do Usuário Logado (Design Web)

```javascript
// Pegar usuário atual
const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Pegar nome para o topo do design
const getUserName = () => {
  const user = getCurrentUser();
  return user?.name || 'Usuário';
};

// Pegar role do usuário
const getUserRole = () => {
  const user = getCurrentUser();
  return user?.role || 'USER';
};

// Pegar email
const getUserEmail = () => {
  const user = getCurrentUser();
  return user?.email || '';
};
```

### Exemplo de Header com Nome do Usuário

```jsx
// React/Components/Header.jsx
function Header() {
  const userName = getUserName();
  const userRole = getUserRole();

  return (
    <header className="top-bar">
      <div className="user-info">
        <span className="user-name">{userName}</span>
        <span className="user-role badge">{userRole}</span>
      </div>
      <button onClick={logout}>Sair</button>
    </header>
  );
}
```

---

## 🎯 Controller Authentication

### 📍 Base URL: `/api/auth`

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/login` | Fazer login | ❌ Público |

### POST `/api/auth/login`

**Body Request:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha1234"
}
```

**Validações:**
- `email`: obrigatório, formato email válido
- `password`: obrigatório, mínimo 8 caracteres

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros:**
- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Email ou senha incorretos

---

## 👥 Controller Usuarios

### 📍 Base URL: `/api/usuarios`

| Método | Endpoint | Descrição | Autenticação | Role |
|--------|----------|-----------|--------------|------|
| POST | `/save` | Criar usuário | ❌ Público | - |
| GET | `/findAll` | Listar todos | 🔒 Required | MASTER |
| GET | `/find` | Buscar por ID | 🔒 Required | MASTER |
| GET | `/me` | Dados do usuário atual | 🔒 Required | Qualquer |
| PUT | `/me/senha` | Alterar senha | 🔒 Required | Qualquer |
| DELETE | `/delete` | Deletar usuário | 🔒 Required | MASTER |

### POST `/api/usuarios/save`

**Body Request:**
```json
{
  "id": "auto",
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha1234",
  "role": "USER"
}
```

**Validações:**
- `name`: obrigatório
- `email`: obrigatório, formato email válido, único
- `password`: obrigatório, mínimo 8 caracteres
- `role`: obrigatório, valores: `MASTER`, `ADMIN`, `USER`

**Response (201 Created):**
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "role": "USER"
}
```

### GET `/api/usuarios/me`

**Response (200 OK):**
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "role": "USER"
}
```

**Use para:** Mostrar nome do usuário logado no topo do design.

### PUT `/api/usuarios/me/senha`

**Body Request:**
```json
{
  "currentPassword": "senhaAntiga",
  "newPassword": "novaSenha123"
}
```

**Response (204 No Content)**

### GET `/api/usuarios/findAll?id={id}`

**Query Param:** `id` (opcional)
- Se passada, busca por ID específico
- Se omitida, lista todos os usuários

**Response (200 OK):**
```json
[
  {
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "role": "USER"
  }
]
```

### DELETE `/api/usuarios/delete?email={email}`

**Query Param:** `email` (obrigatório)

**Response (204 No Content)**

---

## 🏍️ Controller Motoboys

### 📍 Base URL: `/api/motoboys`

| Método | Endpoint | Descrição | Autenticação | Role |
|--------|----------|-----------|--------------|------|
| POST | `/` | Criar motoboy | 🔒 Required | Qualquer |
| GET | `/` | Listar motoboys do usuário | 🔒 Required | Qualquer |
| GET | `/findAll` | Listar TODOS motoboys | 🔒 Required | MASTER |
| GET | `/{id}` | Buscar por ID | 🔒 Required | Qualquer |
| DELETE | `/` | Deletar motoboy | 🔒 Required | Qualquer |
| PUT | `/` | Atualizar motoboy | 🔒 Required | Qualquer |

### POST `/api/motoboys`

**Body Request:**
```json
{
  "nome": "Carlos Souza",
  "telefone": "11999999999",
  "cpf": "12345678900",
  "ativo": true
}
```

**Response (200 OK):**
```json
{
  "id": "abc123",
  "nome": "Carlos Souza",
  "telefone": "11999999999",
  "cpf": "***.***.**-**",
  "ativo": true,
  "userId": "user123"
}
```

### GET `/api/motoboys`

**Response (200 OK):**
```json
[
  {
    "id": "abc123",
    "nome": "Carlos Souza",
    "telefone": "11999999999",
    "cpf": "***.***.**-**",
    "ativo": true,
    "userId": "user123"
  }
]
```

**Note:** Retorna apenas motoboys do usuário logado.

### GET `/api/motoboys/{id}`

**Path Param:** `id` (obrigatório)

**Response (200 OK):**
```json
{
  "id": "abc123",
  "nome": "Carlos Souza",
  "telefone": "11999999999",
  "cpf": "***.***.**-**",
  "ativo": true,
  "userId": "user123"
}
```

### DELETE `/api/motoboys?id={id}`

**Query Param:** `id` (obrigatório)

**Response (204 No Content)**

### PUT `/api/motoboys`

**Body Request:**
```json
{
  "id": "abc123",
  "nome": "Carlos Souza",
  "telefone": "11999999999",
  "ativo": false
}
```

**Response (200 OK):**
```json
{
  "id": "abc123",
  "nome": "Carlos Souza",
  "telefone": "11999999999",
  "cpf": "***.***.**-**",
  "ativo": false,
  "userId": "user123"
}
```

---

## 📦 Controller Entregas

### 📍 Base URL: `/api/entregas`

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/` | Criar entrega | 🔒 Required |
| GET | `/` | Listar entregas do usuário | 🔒 Required |
| GET | `/{id}` | Buscar entrega por ID | 🔒 Required |
| PATCH | `/{id}/valor` | Atualizar valor | 🔒 Required |
| DELETE | `/{id}` | Deletar entrega | 🔒 Required |
| GET | `/data?date={date}` | Entregas por data | 🔒 Required |
| GET | `/motoboy/{motoboyId}` | Entregas de um motoboy | 🔒 Required |
| GET | `/motoboy/{motoboyId}/data?date={date}` | Entregas motoboy por data | 🔒 Required |
| GET | `/relatorio` | Relatório geral por período | 🔒 Required |
| GET | `/motoboy/{motoboyId}/relatorio` | Relatório motoboy por período | 🔒 Required |
| GET | `/resumo` | Resumo financeiro | 🔒 Required |

### POST `/api/entregas`

**Body Request:**
```json
{
  "data": "2026-07-19",
  "valor": 15.50,
  "motoboyId": "abc123"
}
```

**Validações:**
- `data`: formato ISO Date (YYYY-MM-DD)
- `valor`: obrigatório, maior que zero
- `motoboyId`: obrigatório, deve pertencer ao usuário logado

**Response (201 Created):**
```json
{
  "id": "entrega123",
  "data": "2026-07-19T00:00:00",
  "valor": 15.50,
  "motoboyId": "abc123",
  "motoboyNome": "Carlos Souza",
  "userId": "user123"
}
```

### GET `/api/entregas`

**Response (200 OK):**
```json
[
  {
    "id": "entrega123",
    "data": "2026-07-19T00:00:00",
    "valor": 15.50,
    "motoboyId": "abc123",
    "motoboyNome": "Carlos Souza",
    "userId": "user123"
  }
]
```

**Note:** Retorna TODAS as entregas do usuário logado.

### GET `/api/entregas/{id}`

**Path Param:** `id` (obrigatório)

**Response (200 OK):**
```json
{
  "id": "entrega123",
  "data": "2026-07-19T00:00:00",
  "valor": 15.50,
  "motoboyId": "abc123",
  "motoboyNome": "Carlos Souza",
  "userId": "user123"
}
```

### PATCH `/api/entregas/{id}/valor`

**Path Param:** `id` (obrigatório)

**Body Request:**
```json
{
  "value": 20.50
}
```

**Validações:**
- `value`: obrigatório, maior que zero

**Response (200 OK):**
```json
{
  "id": "entrega123",
  "data": "2026-07-19T00:00:00",
  "valor": 20.50,
  "motoboyId": "abc123",
  "motoboyNome": "Carlos Souza",
  "userId": "user123"
}
```

### DELETE `/api/entregas/{id}`

**Path Param:** `id` (obrigatório)

**Response (204 No Content)**

### GET `/api/entregas/data?date={date}`

**Params:**
- `date`: formato YYYY-MM-DD

**Exemplo:** `/api/entregas/data?date=2026-07-19`

**Response (200 OK):**
```json
[
  {
    "id": "entrega123",
    "data": "2026-07-19T00:00:00",
    "valor": 15.50,
    "motoboyId": "abc123",
    "motoboyNome": "Carlos Souza",
    "userId": "user123"
  }
]
```

**Use para:** Faturamento geral diário.

### GET `/api/entregas/motoboy/{motoboyId}`

**Path Param:** `motoboyId` (obrigatório)

**Response (200 OK):**
```json
[
  {
    "id": "entrega123",
    "data": "2026-07-19T00:00:00",
    "valor": 15.50,
    "motoboyId": "abc123",
    "motoboyNome": "Carlos Souza",
    "userId": "user123"
  }
]
```

### GET `/api/entregas/motoboy/{motoboyId}/data?date={date}`

**Params:**
- `motoboyId`: ID do motoboy
- `date`: formato YYYY-MM-DD

**Exemplo:** `/api/entregas/motoboy/abc123/data?date=2026-07-19`

**Use para:** Fechamento diário do motoboy.

### GET `/api/entregas/relatorio`

**Params:**
- `startDate`: formato YYYY-MM-DD
- `endDate`: formato YYYY-MM-DD

**Exemplo:** `/api/entregas/relatorio?startDate=2026-07-01&endDate=2026-07-31`

**Use para:** Relatório GERAL por período.

### GET `/api/entregas/motoboy/{motoboyId}/relatorio`

**Params:**
- `motoboyId`: ID do motoboy
- `startDate`: formato YYYY-MM-DD
- `endDate`: formato YYYY-MM-DD

**Exemplo:** `/api/entregas/motoboy/abc123/relatorio?startDate=2026-07-01&endDate=2026-07-31`

**Use para:** Relatório de UM motoboy por período.

### GET `/api/entregas/resumo`

**Params:**
- `startDate`: formato YYYY-MM-DD
- `endDate`: formato YYYY-MM-DD

**Exemplo:** `/api/entregas/resumo?startDate=2026-07-01&endDate=2026-07-31`

**Response (200 OK):**
```json
{
  "totalEntregas": 45,
  "valorTotal": 675.50
}
```

**Use para:** Resumo financeiro (soma total) do período.

---

## 👑 Endpoints MASTER (Acesso Restrito)

### 🔓 Apenas usuários com role `MASTER`

A tabela abaixo mostra todos os endpoints que requerem role MASTER. Usuários com role `ADMIN` ou `USER` receberão erro `403 Forbidden` ao tentar acessá-los.

### Controller Usuarios

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/usuarios/findAll` | Listar TODOS usuários |
| GET | `/api/usuarios/find?id={id}` | Buscar usuário específico |
| DELETE | `/api/usuarios/delete?email={email}` | Deletar usuário por email |

### Controller Motoboys

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/motoboys/findAll` | Listar TODOS motoboys (de todos usuários) |

### Como Requisistar Token de Autenticação nos Erros

**Erro 401 Unauthorized:**
```javascript
try {
  await api.get('/api/entregas');
} catch (error) {
  if (error.response?.status === 401) {
    // Token expirado ou inválido
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirecionar para login
    window.location.href = '/login';
  }
}
```

**Erro 403 Forbidden:**
```javascript
try {
  await api.get('/api/usuarios/findAll');
} catch (error) {
  if (error.response?.status === 403) {
    // Sem permissão MASTER
    alert('Você não tem permissão para acessar este recurso.');
  }
}
```

---

## 🚀 Exemplos de Integração

### Exemplo Completo: Dashboard de Entregas

```javascript
// hooks/useEntregas.js
import { useState, useEffect } from 'react';
import api from '../api/config';

export const useEntregas = (startDate, endDate) => {
  const [entregas, setEntregas] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar entregas do período
        const entregasResponse = await api.get('/api/entregas/relatorio', {
          params: { startDate, endDate }
        });
        setEntregas(entregasResponse.data);

        // Buscar resumo financeiro
        const resumoResponse = await api.get('/api/entregas/resumo', {
          params: { startDate, endDate }
        });
        setResumo(resumoResponse.data);
      } catch (error) {
        console.error('Erro ao buscar entregas:', error);
        if (error.response?.status === 401) {
          // Redirecionar para login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return { entregas, resumo, loading };
};
```

### Exemplo: Criar Nova Entrega

```javascript
const createEntrega = async (data, valor, motoboyId) => {
  try {
    const response = await api.post('/api/entregas', {
      data,
      valor,
      motoboyId
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      // Erro de validação
      console.error('Dados inválidos:', error.response.data);
    } else {
      console.error('Erro ao criar entrega:', error);
    }
    throw error;
  }
};
```

---

## 📝 Notas Importantes

1. **Token JWT**
   - Deve ser armazenado no `localStorage` com a chave `'token'`
   - Deve ser enviado no header `Authorization: Bearer {token}` em todas as requisições privadas

2. **Formato de Datas**
   - Todas as datas devem seguir o formato ISO: `YYYY-MM-DD`
   - Exemplo: `2026-07-19`

3. **Roles de Usuário**
   - `MASTER`: Acesso completo a todos os recursos
   - `ADMIN`: Acesso limitado (ainda não definido completamente)
   - `USER`: Acesso apenas aos próprios dados

4. **CORS**
   - Origens permitidas: `http://localhost:3000` e `http://localhost:5173`
   - Para produção, configure a origem correta no `application.properties`

5. **Documentação Swagger**
   - Disponível em: `http://localhost:8080/swagger-ui.html`
   - Use para testar endpoints durante desenvolvimento

---

## 🆘 Suporte

Para dúvidas ou problemas, consulte:
- Documentação Swagger: `/swagger-ui.html`
- Logs da API no console
- Verifique as configurações de CORS no backend
- Confirme se o token JWT está sendo enviado corretamente
