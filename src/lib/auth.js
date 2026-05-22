export const BENCHPRO_DOMAIN = 'benchpro.in'

const FREE_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'aol.com', 'mail.com', 'protonmail.com', 'ymail.com',
  'msn.com', 'me.com', 'mac.com', 'googlemail.com',
])

export function getEmailDomain(email) {
  return email.trim().split('@')[1]?.toLowerCase() ?? ''
}

export function isBenchProEmail(email) {
  return getEmailDomain(email) === BENCHPRO_DOMAIN
}

export function isFreeEmail(email) {
  return FREE_DOMAINS.has(getEmailDomain(email))
}

export function isCompanyEmail(email) {
  const domain = getEmailDomain(email)
  return domain.length > 0 && !FREE_DOMAINS.has(domain) && domain !== BENCHPRO_DOMAIN
}

export const ROLE_LABELS = {
  super_recruiter: 'Super Recruiter',
  recruiter:       'Recruiter',
  client:          'Client',
  candidate:       'Candidate',
}

export const ROLE_HOME = {
  super_recruiter: '/dashboard',
  recruiter:       '/dashboard',
  client:          '/dashboard',
  candidate:       '/dashboard',
}
