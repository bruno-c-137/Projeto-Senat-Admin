// Welcome to Keystone!
//
// This file is what Keystone uses as the entry-point to your headless backend
//
// Keystone imports the default export of this file, expecting a Keystone configuration object
//   you can find out more at https://keystonejs.com/docs/apis/config

import { config } from '@keystone-6/core'
import { graphql } from '@keystone-6/core'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// to keep this file tidy, we define our schema in a different file
import { lists } from './schema'

// authentication is configured separately here too, but you might move this elsewhere
// when you write your list-level access control functions, as they typically rely on session data

import { withAuth, session } from './auth/auth'

// Import custom mutations
import { buscarAtivacaoPorUuid, meuHistoricoCheckins, escanearQRCode, gerarQRCodeAtivacao } from './mutations/checkin'

export default withAuth(
  config({
    db: {
      // Using PostgreSQL with the senat database
      provider: 'postgresql',
      url: process.env.DATABASE_URL!,
      extendPrismaSchema: (schema: string) => {
        // Apenas índice único em CheckIn(userId, ativacaoId)
        if (schema.includes('@@unique([userId, ativacaoId])')) {
          return schema
        }
        const checkinModelRegex = /model CheckIn \{[\s\S]*?\n\}/m
        return schema.replace(checkinModelRegex, (block: string) => {
          if (block.includes('@@unique([userId, ativacaoId])')) return block
          return block.replace(/\n\}$/m, `\n  @@unique([userId, ativacaoId])\n}`)
        })
      },
    },
    lists,
    session,
    extendGraphqlSchema: graphql.extend(base => ({
      mutation: {
        escanearQRCode,
        gerarQRCodeAtivacao,
      },
      query: {
        buscarAtivacaoPorUuid,
        meuHistoricoCheckins,
      },
    })),
  } as any)
)
