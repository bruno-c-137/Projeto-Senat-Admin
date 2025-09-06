import { graphql } from '@keystone-6/core'
import { Context } from '.keystone/types'
import { verificarAutenticacao, criarRespostaErro } from '../utils/checkinUtils'
import {
    PERFIL_COMPLETO,
    PERFIL_BASICO,
    PERFIL_ADMIN,
    createPerfilResponseType,
    buscarUsuario
} from '../utils/perfilHelpers'

// Mutation para atualizar perfil
export const atualizarMeuPerfil = graphql.field({
    type: createPerfilResponseType('AtualizarPerfilResult'),
    args: {
        name: graphql.arg({ type: graphql.String }),
        telefone: graphql.arg({ type: graphql.String }),
        fotoPerfil: graphql.arg({ type: graphql.Upload }),
    },
    async resolve(source, args, context: Context) {
        try {
            // Verificar autenticação de forma mais elegante
            const userId = context.session?.itemId
            if (!userId) {
                return criarRespostaErro('Usuário não autenticado. Faça login para editar seu perfil.')
            }

            // Preparar dados para atualização
            const updateData: any = {}

            if (args.name !== undefined) updateData.name = args.name
            if (args.telefone !== undefined) updateData.telefone = args.telefone
            if (args.fotoPerfil !== undefined) updateData.fotoPerfil = { upload: args.fotoPerfil }

            if (Object.keys(updateData).length === 0) {
                return criarRespostaErro('Nenhum campo fornecido para atualização')
            }

            // Atualizar e buscar dados atualizados em uma operação
            await context.sudo().db.User.updateOne({ where: { id: userId }, data: updateData })
            const user = await buscarUsuario(context, userId, PERFIL_BASICO)

            return {
                success: true,
                message: 'Perfil atualizado com sucesso!',
                user
            }
        } catch (error: any) {
            console.error('Erro ao atualizar perfil:', error)
            return criarRespostaErro('Erro interno do servidor ao atualizar perfil')
        }
    },
})

// Query: Perfil completo do usuário logado
export const meuPerfil = graphql.field({
    type: createPerfilResponseType('MeuPerfilResult'),
    async resolve(source, args, context: Context) {
        try {
            // Verificar se está autenticado de forma mais elegante
            const userId = context.session?.itemId
            if (!userId) {
                return criarRespostaErro('Usuário não autenticado. Faça login para acessar seu perfil.')
            }

            const user = await buscarUsuario(context, userId, PERFIL_COMPLETO)

            return user
                ? { success: true, message: 'Perfil carregado com sucesso', user }
                : criarRespostaErro('Usuário não encontrado')

        } catch (error: any) {
            console.error('Erro ao buscar perfil:', error)
            return criarRespostaErro('Erro interno do servidor ao buscar perfil')
        }
    },
})

// Query: Perfil de outros usuários (apenas admins)
export const perfilUsuario = graphql.field({
    type: createPerfilResponseType('PerfilUsuarioResult'),
    args: {
        userId: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    },
    async resolve(source, { userId }, context: Context) {
        try {
            // Verificar autenticação de forma mais elegante
            const currentUserId = context.session?.itemId
            if (!currentUserId) {
                return criarRespostaErro('Usuário não autenticado. Faça login para acessar esta funcionalidade.')
            }

            // Verificar se é admin
            if (!context.session?.data.isAdmin) {
                return criarRespostaErro('Apenas administradores podem visualizar perfis de outros usuários')
            }

            const user = await buscarUsuario(context, userId, PERFIL_ADMIN)

            return user
                ? { success: true, message: 'Perfil do usuário carregado com sucesso', user }
                : criarRespostaErro('Usuário não encontrado')

        } catch (error: any) {
            console.error('Erro ao buscar perfil do usuário:', error)
            return criarRespostaErro('Erro interno do servidor ao buscar perfil do usuário')
        }
    },
})
