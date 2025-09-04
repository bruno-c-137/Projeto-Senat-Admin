import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import { text, timestamp, integer, relationship, select } from '@keystone-6/core/fields'

export const Ativacao = list({
  access: allowAll,
  graphql: {
    plural: 'Ativacoes'
  },
  hooks: {
    validateInput: ({ resolvedData, addValidationError }) => {
      // Valida se o evento foi selecionado
      if (!resolvedData.evento) {
        addValidationError('Evento é obrigatório')
      }
    }
  },
  fields: {
    nome: text({
      validation: { isRequired: true },
      label: 'Nome da Ativação'
    }),
    pontuacao: integer({
      validation: { isRequired: true },
      defaultValue: 10,
      label: 'Pontuação',
      ui: {
        description: 'Pontos que o usuário ganha ao fazer check-in nesta ativação'
      }
    }),
    uuid: text({
      label: 'UUID Atual',
      ui: {
        description: 'UUID gerado automaticamente quando QR code é criado',
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' }
      }
    }),
    evento: relationship({
      ref: 'Events',
      label: 'Evento Relacionado',
      ui: {
        description: 'Evento ao qual esta ativação pertence (obrigatório)',
        displayMode: 'select',
        labelField: 'evento'
      }
    }),
    checkIns: relationship({
      ref: 'CheckIn.ativacao',
      many: true,
      label: 'Check-ins',
      ui: {
        displayMode: 'count',
        description: 'Check-ins realizados nesta ativação',
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' }
      }
    }),
    ativa: select({
      type: 'string',
      options: [
        { label: 'Ativa', value: 'ativa' },
        { label: 'Inativa', value: 'inativa' }
      ],
      validation: { isRequired: true },
      defaultValue: 'ativa',
      label: 'Status',
      ui: {
        description: 'Status da ativação - apenas ativações ativas permitem check-in',
        displayMode: 'select',
        createView: { fieldMode: 'edit' }
      }
    }),
    createdAt: timestamp({
      defaultValue: { kind: 'now' },
      validation: { isRequired: true },
      label: 'Data de Criação'
    }),
  },
  ui: {
    label: 'Ativações',
    description: 'Gerenciar ativações disponíveis para check-in via QR code'
  }
})
