import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import { text, timestamp, password } from '@keystone-6/core/fields'

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
    createdAt: timestamp({
      defaultValue: { kind: 'now' },
      label: 'Data de Criação'
    }),
  },
})

