import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Buscar estatísticas gerais
      const [
        totalUsers,
        totalCheckIns,
        totalPontos,
        checkInsHoje,
        checkInsSemana,
        checkInsMes
      ] = await Promise.all([
        // Total de usuários
        prisma.user.count(),
        
        // Total de check-ins
        prisma.checkIn.count(),
        
        // Total de pontos distribuídos
        prisma.checkIn.aggregate({
          _sum: {
            pontosGanhos: true
          }
        }),
        
        // Check-ins de hoje
        prisma.checkIn.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        
        // Check-ins da semana
        prisma.checkIn.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7))
            }
          }
        }),
        
        // Check-ins do mês
        prisma.checkIn.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      ])

      // Top locais de check-in
      const topLocais = await prisma.checkIn.groupBy({
        by: ['local'],
        _count: {
          local: true
        },
        orderBy: {
          _count: {
            local: 'desc'
          }
        },
        take: 5
      })

      // Usuários mais ativos
      const usuariosMaisAtivos = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          pontos: true,
          _count: {
            select: {
              checkIns: true
            }
          }
        },
        orderBy: {
          checkIns: {
            _count: 'desc'
          }
        },
        take: 5
      })

      res.status(200).json({
        success: true,
        data: {
          geral: {
            totalUsers,
            totalCheckIns,
            totalPontos: totalPontos._sum.pontosGanhos || 0
          },
          periodos: {
            hoje: checkInsHoje,
            semana: checkInsSemana,
            mes: checkInsMes
          },
          topLocais: topLocais.map(local => ({
            local: local.local,
            totalCheckIns: local._count.local
          })),
          usuariosMaisAtivos: usuariosMaisAtivos.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            pontos: user.pontos,
            totalCheckIns: user._count.checkIns
          }))
        }
      })

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

