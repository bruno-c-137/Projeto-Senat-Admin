import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import { text, timestamp, password, checkbox, integer, relationship, virtual } from '@keystone-6/core/fields'
import { graphql } from '@keystone-6/core'

export const User = list({
  access: allowAll,
  fields: {
    name: text({
      validation: { isRequired: true },
      label: 'Nome'
    }),
    email: text({
      validation: { isRequired: true },
      isIndexed: 'unique',
      label: 'E-mail'
    }),
    password: password({
      validation: { isRequired: true },
      label: 'Senha'
    }),
    isAdmin: checkbox({ defaultValue: false, label: 'Administrador' }),
    pontos: integer({
      defaultValue: 0,
      label: 'Pontos Manuais',
      ui: {
        description: 'Pontos adicionados manualmente pelo admin (não inclui pontos de check-ins)'
      }
    }),
    checkIns: relationship({
      ref: 'CheckIn.user',
      many: true,
      label: 'Check-ins',
      ui: {
        displayMode: 'count',
        description: 'Histórico de check-ins realizados',
        createView: { fieldMode: 'hidden' }, // Esconde na criação
        itemView: { fieldMode: 'read' } // Mostra apenas leitura na visualização
      }
    }),
    pontuacaoTotal: virtual({
      field: graphql.field({
        type: graphql.Int,
        async resolve(item: any, args: any, context: any) {
          // Busca a soma de todos os pontos ganhos em check-ins
          const checkIns = await context.query.CheckIn.findMany({
            where: { user: { id: { equals: item.id } } },
            query: 'pontosGanhos'
          })

          const pontosCheckIns = checkIns.reduce((total: number, checkIn: any) => {
            return total + (checkIn.pontosGanhos || 0)
          }, 0)

          // Soma pontos manuais + pontos de check-ins
          return (item.pontos || 0) + pontosCheckIns
        }
      }),
      ui: {
        description: 'Pontuação total (pontos manuais + pontos de check-ins)',
        query: '{ pontuacaoTotal }',
        createView: { fieldMode: 'hidden' }, // Esconde na criação
        itemView: { fieldMode: 'read' } // Mostra apenas leitura na visualização
      }
    }),
    createdAt: timestamp({
      defaultValue: { kind: 'now' },
      label: 'Data de Criação'
    }),
  },
})

