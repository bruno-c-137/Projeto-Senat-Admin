# Sistema de Check-in com QR Codes

## Visão Geral

Este sistema permite que admins criem ativações com QR codes únicos e que usuários façam check-ins escaneando esses códigos, ganhando pontos automaticamente.

## Modelos (Schemas)

### 1. Ativacao
- **Nome**: Nome da ativação
- **Pontuação**: Pontos que o usuário ganha ao fazer check-in
- **UUID**: Identificador único gerado automaticamente
- **Evento**: Relacionamento opcional com um evento
- **Status**: Ativa ou Inativa (apenas ativações ativas permitem check-in)
- **QR Code URL**: URL gerada automaticamente para acessar o QR code

### 2. CheckIn (atualizado)
- **Usuário**: Referência ao usuário que fez check-in
- **Ativação**: Referência à ativação escaneada
- **Pontos Ganhos**: Copiado da ativação no momento do check-in
- **Local**: Local onde o check-in foi realizado (opcional)
- **Data**: Timestamp automático

### 3. User (atualizado)
- **Pontuação Total**: Campo virtual que calcula pontos manuais + pontos de check-ins

## APIs GraphQL

### Mutations

#### `realizarCheckin`
Realiza check-in via UUID da ativação.

```graphql
mutation {
  realizarCheckin(
    ativacaoUuid: "123e4567-e89b-12d3-a456-426614174000"
    local: "Auditório Principal"
  ) {
    success
    message
    checkIn
    pontuacaoTotal
  }
}
```

### Queries

#### `buscarAtivacaoPorUuid`
Busca informações de uma ativação pelo UUID (para validar QR code).

```graphql
query {
  buscarAtivacaoPorUuid(uuid: "123e4567-e89b-12d3-a456-426614174000") {
    success
    message
    ativacao
    jaFezCheckin
  }
}
```

#### `meuHistoricoCheckins`
Retorna histórico de check-ins do usuário autenticado.

```graphql
query {
  meuHistoricoCheckins {
    id
    pontosGanhos
    local
    createdAt
    ativacao {
      nome
      evento {
        evento
      }
    }
  }
}
```

### Gerar QR Code para Ativação
Gera QR code para uma ativação existente ou cria uma nova para um evento.

```graphql
mutation {
  gerarQRCodeAtivacao(ativacaoId: "id_existente" ) {  # Ou use eventId para criar nova
    success
    message
    qrCodeDataURL
  }
}
```

**Nota**: A mutation foi mesclada para suportar ambos os casos (ativação existente ou nova via evento). Código modularizado com utilitários em utils/checkinUtils.ts.

## Endpoints HTTP

### QR Code Image
```