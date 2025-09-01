import { list } from '@keystone-6/core'
import { allowAll, denyAll } from '@keystone-6/core/access'
import { text, timestamp, integer, relationship } from '@keystone-6/core/fields'

export const CheckIn = list({
  access: {
    operation: {
      query: allowAll,
      create: denyAll, // Bloqueia criação manual
      update: denyAll, // Bloqueia edição manual
      delete: denyAll  // Bloqueia exclusão manual
    }
  },
  graphql: {
    plural: 'CheckIns'
  },
  ui: {
    isHidden: false,
    label: 'Check-ins',
    description: 'Registros de check-ins realizados via QR code (somente visualização)',
    hideCreate: true, // Esconde botão de criar
    hideDelete: true, // Esconde botão de deletar
    itemView: {
      defaultFieldMode: 'read' // Força modo somente leitura
    }
  },
  fields: {
    user: relationship({
      ref: 'User.checkIns',
      many: false,
      label: 'Usuário',
      ui: {
        displayMode: 'select',
        labelField: 'name',
        createView: { fieldMode: 'hidden' }, // Esconde na criação
        itemView: { fieldMode: 'read' } // Somente leitura
      }
    }),
    pontosGanhos: integer({
      defaultValue: 0,
      label: 'Pontos Ganhos',
      validation: { isRequired: true },
      ui: {
        description: 'Pontos ganhos neste check-in',
        createView: { fieldMode: 'hidden' }, // Esconde na criação
        itemView: { fieldMode: 'read' } // Somente leitura
      }
    }),
    local: text({
      label: 'Local do Check-in',
      defaultValue: '',
      ui: {
        description: 'Local onde o check-in foi realizado',
        createView: { fieldMode: 'hidden' }, // Esconde na criação
        itemView: { fieldMode: 'read' } // Somente leitura
      }
    }),
    createdAt: timestamp({
      defaultValue: { kind: 'now' },
      label: 'Data do Check-in',
      ui: {
        description: 'Data e hora do check-in',
        createView: { fieldMode: 'hidden' }, // Esconde na criação
        itemView: { fieldMode: 'read' } // Somente leitura
      }
    }),
  }
})

