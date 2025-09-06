import { list } from '@keystone-6/core'
import { allowAll, denyAll } from '@keystone-6/core/access'
import { text, timestamp, password, checkbox, integer, relationship, virtual } from '@keystone-6/core/fields'
import { cloudinaryImage } from '@keystone-6/cloudinary'
import { graphql } from '@keystone-6/core'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

export const User = list({
  access: {
    operation: {
      query: allowAll, // Todos podem ver perfis
      create: allowAll, // Permitir registro de novos usuários
      update: ({ session }) => {
        // Apenas usuários autenticados podem editar
        // Controle específico será feito a nível de item
        return !!session
      },
      delete: ({ session }) => {
        // Apenas admins podem deletar usuários
        return session?.data.isAdmin || false
      }
    },
    filter: {
      // Controle de filtros para consultas específicas se necessário
      query: () => true, // Por enquanto permite ver todos
    },
    item: {
      // Controle de acesso a itens específicos
      update: ({ session, item }) => {
        if (!session) return false
        // Admins podem editar qualquer usuário
        if (session.data.isAdmin) return true
        // Usuários podem editar apenas seu próprio perfil
        return session.itemId === item.id
      },
      delete: ({ session, item }) => {
        if (!session) return false
        // Apenas admins podem deletar usuários
        return session.data.isAdmin || false
      }
    }
  },
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
    telefone: text({
      label: 'Telefone',
      ui: {
        description: 'Telefone para contato (opcional)'
      }
    }),
    fotoPerfil: cloudinaryImage({
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
        apiKey: process.env.CLOUDINARY_API_KEY!,
        apiSecret: process.env.CLOUDINARY_API_SECRET!,
        folder: 'senat-admin/avatares',
      },
      label: 'Foto de Perfil',
      ui: {
        description: 'Sua foto de perfil (será armazenada no Cloudinary para melhor performance)'
      }
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
        createView: { fieldMode: 'hidden' }, // Esconde na criação
        itemView: { fieldMode: 'read' } // Mostra apenas leitura na visualização
      }
    }),
    createdAt: timestamp({
      defaultValue: { kind: 'now' },
      label: 'Data de Criação',
      ui: {
        createView: { fieldMode: 'hidden' },

      }
    }),
  },
})

