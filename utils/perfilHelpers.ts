import { graphql } from '@keystone-6/core'
import { Context } from '.keystone/types'

// Query fragments padronizadas para perfil
export const PERFIL_COMPLETO = `
  id name email telefone pontos pontuacaoTotal createdAt
  fotoPerfil { id filename originalFilename mimetype publicUrl publicUrlTransformed(transformation: { width: "400", height: "400", crop: "fill", gravity: "face" }) }
  checkIns { id pontosGanhos local createdAt ativacao { nome evento { evento } } }
`

export const PERFIL_BASICO = `
  id name email telefone pontos pontuacaoTotal
  fotoPerfil { id filename publicUrl publicUrlTransformed(transformation: { width: "400", height: "400", crop: "fill", gravity: "face" }) }
`

export const PERFIL_ADMIN = `
  id name email telefone pontuacaoTotal createdAt
  fotoPerfil { id filename publicUrl }
`

// Helper: Tipo de resposta padrão para perfil
export const createPerfilResponseType = (name: string) => graphql.object<{
    success: boolean
    message: string
    user?: any
}>()({
    name,
    fields: {
        success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
        message: graphql.field({ type: graphql.nonNull(graphql.String) }),
        user: graphql.field({ type: graphql.JSON }),
    },
})

// Helper: Buscar usuário com query específica
export const buscarUsuario = async (context: Context, userId: string, query: string) => {
    return await context.query.User.findOne({ where: { id: userId }, query })
}
