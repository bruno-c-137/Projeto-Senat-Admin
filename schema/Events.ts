import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import { text, timestamp, select, relationship, integer } from '@keystone-6/core/fields'

export const Events = list({
    access: allowAll,
    graphql: {
        plural: 'EventsList'
    },
    fields: {
        evento: text({
            validation: { isRequired: true },
            label: 'Nome do Evento'
        }),
        descricao: text({
            label: 'Descrição',
            ui: { displayMode: 'textarea' }
        }),
        horas: text({
            validation: { isRequired: true },
            label: 'Horário (HH:MM)'
        }),
        data: timestamp({
            validation: { isRequired: true },
            label: 'Data do Evento'
        }),
        local: text({
            label: 'Local'
        }),
        status: select({
            type: 'enum',
            options: [
                { label: 'Agendado', value: 'agendado' },
                { label: 'Em Andamento', value: 'em_andamento' },
                { label: 'Concluído', value: 'concluido' },
                { label: 'Cancelado', value: 'cancelado' }
            ],
            defaultValue: 'agendado',
            label: 'Status'
        }),
        responsavel: relationship({
            ref: 'User',
            label: 'Responsável'
        }),
        createdAt: timestamp({
            defaultValue: { kind: 'now' },
            label: 'Data de Criação'
        }),
    },
})
