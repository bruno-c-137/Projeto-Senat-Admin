# Configuração do Cloudinary para Upload de Imagens

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Configuração do Cloudinary
# Você encontra essas informações no dashboard do Cloudinary: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

## ⚠️ ERRO COMUM: URL com "undefined.s3.undefined.amazonaws.com"

Se você está vendo esse erro, significa que **as variáveis de ambiente não estão definidas**.

### Solução Rápida:
```bash
# No arquivo .env na raiz do projeto:
CLOUDINARY_CLOUD_NAME=seu-cloud-name-real
CLOUDINARY_API_KEY=sua-api-key-real
CLOUDINARY_API_SECRET=seu-api-secret-real
```

## Como Obter as Credenciais do Cloudinary

1. **Acesse:** https://cloudinary.com/console
2. **Faça login** na sua conta Cloudinary
3. **No Dashboard**, você verá suas credenciais:
   - **Cloud Name:** Nome único da sua conta
   - **API Key:** Chave pública para autenticação
   - **API Secret:** Chave secreta (mantenha segura!)

### Exemplo de .env:
```bash
# Substitua pelos valores reais do seu dashboard Cloudinary
CLOUDINARY_CLOUD_NAME=minha-conta-cloudinary
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

## Configuração no Railway

Se você está usando Railway para deploy:

1. **No painel do Railway**, vá em **Variables**
2. **Adicione as variáveis:**
   ```
   CLOUDINARY_CLOUD_NAME=seu-cloud-name
   CLOUDINARY_API_KEY=sua-api-key
   CLOUDINARY_API_SECRET=seu-api-secret
   ```

## Configuração de Segurança

⚠️ **IMPORTANTE:** 
- Nunca commite o arquivo `.env` no repositório
- Use `.env.example` para documentar as variáveis necessárias
- No Railway, as variáveis são definidas através do painel web

## Estrutura das Imagens no Cloudinary

As imagens serão organizadas da seguinte forma:
- **Pasta:** `senat-admin/avatars/`
- **Transformações Automáticas:**
  - Avatar padrão: 400x400px, formato WebP, qualidade otimizada
  - Thumbnail: 150x150px, formato WebP, qualidade otimizada
  - Crop inteligente focado no rosto (gravity: face)

## Como Testar no GraphQL Playground

### 1. Acesse o Playground
- **Desenvolvimento:** http://localhost:3000/api/graphql
- **Produção:** https://seu-dominio.up.railway.app/api/graphql

### 2. Fazer Login (necessário para upload)
```graphql
mutation {
  authenticateUserWithPassword(email: "seu@email.com", password: "suasenha") {
    ... on UserAuthenticationWithPasswordSuccess {
      sessionToken
      item {
        id
        name
        email
      }
    }
    ... on UserAuthenticationWithPasswordFailure {
      message
    }
  }
}
```

### 3. Upload de Avatar e Atualização de Perfil
```graphql
mutation AtualizarPerfil($name: String, $telefone: String, $fotoPerfil: Upload) {
  atualizarMeuPerfil(name: $name, telefone: $telefone, fotoPerfil: $fotoPerfil) {
    success
    message
    user {
      id
      name
      email
      telefone
      fotoPerfil {
        id
        url
        filesize
        width
        height
        extension
      }
      pontuacaoTotal
    }
  }
}
```

**Variáveis (aba Variables no Playground):**
```json
{
  "name": "Seu Nome",
  "telefone": "11999999999",
  "fotoPerfil": null
}
```

**Como fazer upload no Playground:**
1. Cole a mutation acima
2. Na aba "Variables", configure os campos desejados
3. Para upload de imagem: deixe `"fotoPerfil": null`
4. Na parte inferior do Playground, clique em "Upload File" e selecione sua imagem
5. A variável `fotoPerfil` será automaticamente preenchida
6. Execute a mutation

**Para apenas fazer upload da imagem (sem alterar outros campos):**
```graphql
mutation UploadAvatar($fotoPerfil: Upload) {
  atualizarMeuPerfil(fotoPerfil: $fotoPerfil) {
    success
    message
    user {
      id
      name
      fotoPerfil {
        id
        url
        filesize
        width
        height
        extension
      }
    }
  }
}
```

### 4. Consultar Perfil com Avatar
```graphql
query {
  meuPerfil {
    success
    message
    user {
      id
      name
      email
      telefone
      fotoPerfil {
        id
        url
        filesize
        width
        height
        extension
      }
      pontuacaoTotal
      createdAt
    }
  }
}
```

### 5. Testar URLs das Imagens
Após o upload, você pode testar as transformações automáticas:

**Avatar padrão (400x400):**
```
https://res.cloudinary.com/seu-cloud-name/image/upload/c_fill,g_face,h_400,w_400,f_webp,q_auto:good/senat-admin/avatars/sua-imagem-id
```

**Thumbnail (150x150):**
```
https://res.cloudinary.com/seu-cloud-name/image/upload/c_fill,g_face,h_150,w_150,f_webp,q_auto:good/senat-admin/avatars/sua-imagem-id
```

## Validações Implementadas

✅ **Tipos de arquivo permitidos:** JPEG, PNG, WebP  
✅ **Tamanho máximo:** 5MB  
✅ **Autenticação obrigatória**  
✅ **Transformações automáticas** (crop inteligente, otimização)  
✅ **Organização em pastas** no Cloudinary  

## Troubleshooting

### Erro: "Cloudinary credentials not configured"
- Verifique se as variáveis de ambiente estão definidas corretamente
- No Railway: vá em Variables e adicione as credenciais do Cloudinary

### Erro: "Upload failed"
- Verifique o formato do arquivo (apenas JPEG, PNG, WebP)
- Verifique o tamanho (máximo 5MB)
- Teste sua conexão com o Cloudinary

### Erro: "User not authenticated"
- Execute a mutation de login primeiro
- Verifique se o sessionToken está sendo enviado nos headers
