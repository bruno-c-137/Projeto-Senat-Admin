# 👤 Sistema de Perfil do Usuário

## 🚀 Visão Geral

Sistema completo e otimizado para edição de perfil e upload de foto. Usuários podem editar seus próprios dados e administradores podem editar qualquer perfil. **Código refatorado para máxima eficiência e manutenibilidade.**

## ✨ Funcionalidades Implementadas

### 1. **Campos do Perfil**
- **Nome**: Nome completo (obrigatório)
- **Email**: Email único (obrigatório)  
- **Telefone**: Campo opcional para contato
- **Foto de Perfil**: Upload de imagem armazenada localmente
- **Pontuação**: Pontos manuais + pontos automáticos de check-ins

### 2. **Controle de Acesso** 
- ✅ Usuários podem editar apenas seu próprio perfil
- ✅ Usuários podem visualizar apenas seu próprio perfil completo  
- ✅ **Apenas administradores** podem visualizar perfis de outros usuários
- ✅ **Apenas administradores** podem editar qualquer perfil
- ✅ **Apenas administradores** podem deletar usuários

### 3. **Armazenamento de Imagens**
- **Storage Local**: Imagens salvas em `public/images/`
- **URL Pública**: `http://localhost:3000/images/[arquivo]`
- **Formatos Suportados**: PNG, JPEG, GIF, WebP

## 📡 APIs GraphQL Disponíveis

### 1. **Atualizar Meu Perfil**
**Mutation:** `atualizarMeuPerfil`

Permite que o usuário logado atualize seus dados pessoais, **incluindo foto de perfil**.

```graphql
mutation AtualizarPerfil {
  atualizarMeuPerfil(
    name: "João Silva"
    telefone: "(11) 99999-9999"
    fotoPerfil: $arquivo
  ) {
    success
    message
    user
  }
}
```

**Parâmetros (todos opcionais):**
- `name`: Nome completo
- `telefone`: Telefone para contato
- `fotoPerfil`: Arquivo de imagem (Upload)

**Resposta:**
```json
{
  "data": {
    "atualizarMeuPerfil": {
      "success": true,
      "message": "Perfil atualizado com sucesso!",
      "user": {
        "id": "abc123",
        "name": "João Silva",
        "email": "joao@email.com",
        "telefone": "(11) 99999-9999",
        "fotoPerfil": {
          "id": "img123",
          "url": "http://localhost:3000/images/foto.jpg",
          "filesize": 102400
        },
        "pontuacaoTotal": 150
      }
    }
  }
}
```

---

### 2. **Buscar Meu Perfil Completo**
**Query:** `meuPerfil`

Retorna todos os dados do usuário logado, incluindo histórico de check-ins.

```graphql
query MeuPerfil {
  meuPerfil {
    success
    message
    user
  }
}
```

**Resposta:**
```json
{
  "data": {
    "meuPerfil": {
      "success": true,
      "message": "Perfil carregado com sucesso",
      "user": {
        "id": "abc123",
        "name": "João Silva",
        "email": "joao@email.com",
        "telefone": "(11) 99999-9999",
        "pontos": 50,
        "fotoPerfil": {
          "id": "img123",
          "url": "http://localhost:3000/images/foto.jpg",
          "filesize": 102400,
          "width": 400,
          "height": 400,
          "extension": "jpg"
        },
        "pontuacaoTotal": 150,
        "createdAt": "2024-01-15T10:30:00Z",
        "checkIns": [
          {
            "id": "checkin123",
            "pontosGanhos": 10,
            "local": "Auditório Principal",
            "createdAt": "2024-01-15T14:00:00Z",
            "ativacao": {
              "nome": "Palestra sobre IA",
              "evento": {
                "evento": "Tech Conference 2024"
              }
            }
          }
        ]
      }
    }
  }
}
```

---

### 3. **Buscar Perfil de Usuário (Apenas Admins)**
**Query:** `perfilUsuario`

Permite que **apenas administradores** visualizem perfis de outros usuários.

```graphql
query PerfilUsuario {
  perfilUsuario(userId: "abc123") {
    success
    message
    user
  }
}
```

**Parâmetros:**
- `userId`: ID do usuário (obrigatório)

**Restrições:**
- ⚠️ **Apenas administradores** podem usar esta query
- ❌ Usuários comuns receberão erro de permissão

**Resposta de Sucesso (Admin):**
```json
{
  "data": {
    "perfilUsuario": {
      "success": true,
      "message": "Perfil do usuário carregado com sucesso",
      "user": {
        "id": "abc123",
        "name": "João Silva", 
        "email": "joao@email.com",
        "telefone": "(11) 99999-9999",
        "fotoPerfil": {
          "id": "img123",
          "url": "http://localhost:3000/images/foto.jpg"
        },
        "pontuacaoTotal": 150,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    }
  }
}
```

**Resposta de Erro (Usuário Comum):**
```json
{
  "data": {
    "perfilUsuario": {
      "success": false,
      "message": "Apenas administradores podem visualizar perfis de outros usuários",
      "user": null
    }
  }
}
```

## 🔒 Segurança e Validações

### **Controle de Acesso**
- ✅ Todas as mutations exigem autenticação
- ✅ Usuários só podem editar e visualizar próprio perfil
- ✅ **Apenas admins** podem visualizar perfis de outros usuários
- ✅ **Apenas admins** podem editar qualquer perfil
- ✅ **Nenhum dado sensível** é exposto para usuários comuns

### **Validações**
- ✅ Verificação de autenticação em todas as mutations
- ✅ Validação de existência do usuário
- ✅ Sanitização de dados de entrada
- ✅ Tratamento de erros completo

### **Upload de Imagens**
- ✅ Apenas formatos de imagem aceitos
- ✅ Armazenamento local seguro
- ✅ URLs públicas para acesso
- ✅ Controle de tamanho automático

## 🖼️ Upload de Foto de Perfil

### **Via Admin UI**
1. Login no painel admin: `http://localhost:3000/`
2. Ir em "Users" → Selecionar usuário
3. Fazer upload na seção "Foto de Perfil"
4. Salvar alterações

### **Via Frontend/App**
Use a mutation padrão do Keystone para atualizar o campo `fotoPerfil`:

```graphql
mutation AtualizarFoto {
  updateUser(
    where: { id: "user_id" }
    data: { 
      fotoPerfil: { 
        upload: $arquivo 
      } 
    }
  ) {
    id
    fotoPerfil {
      url
    }
  }
}
```

## 🚀 Como Usar no Frontend

### **1. Buscar Perfil do Usuário**
```javascript
const { data } = await client.query({
  query: gql`
    query {
      meuPerfil {
        success
        message
        user
      }
    }
  `
})

const usuario = data.meuPerfil.user
```

### **2. Atualizar Dados do Perfil**
```javascript
const { data } = await client.mutate({
  mutation: gql`
    mutation AtualizarPerfil($nome: String!, $bio: String) {
      atualizarMeuPerfil(name: $nome, bio: $bio) {
        success
        message
        user
      }
    }
  `,
  variables: {
    nome: "Novo Nome",
    bio: "Nova biografia"
  }
})
```

### **3. Upload de Foto**
```javascript
const { data } = await client.mutate({
  mutation: gql`
    mutation {
      updateUser(
        where: { id: "${userId}" }
        data: { fotoPerfil: { upload: $arquivo } }
      ) {
        fotoPerfil {
          url
        }
      }
    }
  `,
  variables: {
    arquivo: arquivoSelecionado
  }
})
```

## 🔧 Configuração Necessária

### **1. Estrutura de Pastas**
```
public/
  images/          # Imagens de perfil armazenadas aqui
    [arquivos...]
```

### **2. Variáveis de Ambiente**
```bash
SERVER_URL=http://localhost:3000  # URL base do servidor
```

### **3. Migração do Banco**
Após implementar, execute:
```bash
yarn keystone build
yarn keystone prisma db push
```

## 📝 Notas Importantes

1. **Storage**: Configurado para storage local. Para produção, considere usar Cloudinary ou S3
2. **CORS**: Já configurado para permitir uploads de diferentes origens
3. **Tipos**: Todos os campos são opcionais exceto nome e email
4. **Performance**: Campo `pontuacaoTotal` é calculado dinamicamente
5. **Backup**: Implemente backup regular da pasta `public/images/`

---

## 🗂️ **Arquivos do Sistema**

- **`schema/User.ts`**: Schema com campos telefone, fotoPerfil + controle de acesso
- **`keystone.ts`**: Storage de imagens + mutations GraphQL
- **`auth/auth.ts`**: Dados de sessão com `isAdmin`
- **`mutations/perfil.ts`**: Mutations otimizadas para perfil
- **`utils/perfilHelpers.ts`**: Helpers reutilizáveis e query fragments
- **`public/images/`**: Pasta para armazenamento de fotos

---

## ✅ Status de Implementação

- [x] Schema atualizado com novos campos
- [x] Controle de acesso implementado  
- [x] Mutations para edição de perfil
- [x] Queries para buscar perfis
- [x] Storage de imagens configurado
- [x] Validações e segurança
- [x] **Código refatorado e otimizado**
- [x] **Helpers organizados em utils/**
- [x] **Query fragments reutilizáveis**
- [x] Documentação completa

**Sistema pronto com código de produção!** 🚀✨