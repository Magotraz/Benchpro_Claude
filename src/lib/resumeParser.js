import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

// ─── Text extraction ──────────────────────────────────────────────────────────

export async function extractTextFromFile(file) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractFromPDF(file)
  }
  return extractFromDocx(file)
}

async function extractFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map(item => item.str).join(' '))
  }
  return pages.join('\n')
}

async function extractFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

const EMAIL_RE    = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/
const PHONE_RE    = /(\+91[\s-]?[6-9]\d{4}[\s-]?\d{5}|91[\s-][6-9]\d{4}[\s-]?\d{5}|[6-9]\d{9}|\+\d{1,3}[\s-]\d{3,5}[\s-]\d{3,4}[\s-]\d{4})/
const URL_RE      = /https?:\/\/|www\./i
const LINKEDIN_RE = /linkedin\.com\/in\/[\w-]+/i
const HEADER_RE   = /^(resume|cv|curriculum vitae|objective|summary|profile|contact|about me|personal details)$/i

const TITLE_KEYWORDS = [
  'Engineer', 'Developer', 'Manager', 'Analyst', 'Consultant',
  'Designer', 'Architect', 'Lead', 'Director', 'Specialist',
  'Associate', 'Executive', 'Officer', 'Administrator', 'Programmer',
  'Scientist', 'Researcher', 'Intern', 'VP', 'President',
  'CTO', 'CEO', 'CFO', 'COO', 'CIO',
]

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Noida', 'Gurgaon', 'Gurugram',
  'Jaipur', 'Chandigarh', 'Kochi', 'Coimbatore', 'Indore', 'Bhopal',
  'Lucknow', 'Patna',
]

const SKILLS_LIST = [
  // Frontend
  'React', 'Angular', 'Vue', 'JavaScript', 'TypeScript', 'HTML', 'CSS',
  'Tailwind', 'Bootstrap', 'jQuery', 'Next.js', 'Nuxt',
  // Backend
  'Node.js', 'Python', 'Java', 'C#', 'C++', 'PHP', 'Ruby', 'Go',
  'Swift', 'Kotlin', 'Rust', 'Scala',
  'Spring Boot', 'Django', 'FastAPI', 'Express', 'Flask', 'Laravel',
  // Enterprise
  'Oracle', 'SAP', 'Salesforce', 'ServiceNow', 'Workday',
  'SAP FICO', 'SAP MM', 'SAP SD', 'SAP ABAP', 'ABAP', 'Basis',
  'SAP S/4HANA', 'Oracle Cloud', 'Oracle EBS',
  'Salesforce CPQ', 'Salesforce LWC', 'Vlocity',
  'HCM', 'ERP', 'CRM', 'SCM',
  // Cloud & DevOps
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
  'CI/CD', 'Jenkins', 'Ansible', 'Helm',
  // Data & Databases
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Spark', 'Hadoop', 'Airflow', 'Power BI', 'Tableau', 'Snowflake',
  'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  // Testing & Tools
  'Git', 'JIRA', 'Confluence', 'Agile', 'Scrum',
  'Selenium', 'Cypress', 'Jest', 'JUnit', 'Pytest',
  // Infrastructure
  'Linux', 'Windows Server', 'Active Directory',
  'Networking', 'CCNA', 'ITIL', 'PMP',
]

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseResumeText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  const email = extractEmail(text)
  const phone = extractPhone(text)
  const name = extractName(lines)
  const experienceYears = extractExperience(text)
  const currentTitle = extractTitle(lines)
  const currentCompany = extractCompany(lines)
  const skills = extractSkills(text)
  const linkedinUrl = extractLinkedIn(text)
  const location = extractLocation(text)

  return { name, email, phone, experienceYears, currentTitle, currentCompany, skills, linkedinUrl, location }
}

function extractEmail(text) {
  const m = text.match(EMAIL_RE)
  return m ? m[0].toLowerCase() : null
}

function extractPhone(text) {
  const m = text.match(PHONE_RE)
  if (!m) return null
  return m[0].replace(/\s+/g, ' ').trim()
}

function extractName(lines) {
  // Take first qualifying line from the top of the resume
  const candidates = lines.slice(0, 12).filter(l =>
    !EMAIL_RE.test(l) &&
    !PHONE_RE.test(l) &&
    !URL_RE.test(l) &&
    !HEADER_RE.test(l.trim()) &&
    l.length >= 3 &&
    l.length <= 60 &&
    // Mostly letters — names shouldn't be mostly numbers/symbols
    (l.match(/[a-zA-Z]/g) ?? []).length >= 3
  )
  const raw = candidates[0]
  if (!raw) return null
  // Title-case it, strip stray punctuation
  return raw
    .replace(/[^\w\s.'-]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || null
}

function extractExperience(text) {
  const matches = [...text.matchAll(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?/gi)]
  const nums = matches.map(m => parseInt(m[1], 10)).filter(n => n > 0 && n < 50)
  return nums.length > 0 ? Math.max(...nums) : null
}

function extractTitle(lines) {
  const titleRe = new RegExp(TITLE_KEYWORDS.join('|'), 'i')
  const hit = lines.slice(0, 25).find(l =>
    titleRe.test(l) &&
    l.length <= 80 &&
    !EMAIL_RE.test(l) &&
    !URL_RE.test(l)
  )
  return hit ? hit.replace(/[|•·,]/g, '').trim() : null
}

function extractCompany(lines) {
  const presentRe = /\bpresent\b|\bcurrently\s+(?:at|with)\b|\bworking\s+at\b/i
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    if (presentRe.test(lines[i])) {
      // Look at nearby lines for a company-like entry
      const window = lines.slice(Math.max(0, i - 3), i + 4)
      const comp = window.find(l =>
        !presentRe.test(l) &&
        !EMAIL_RE.test(l) &&
        !PHONE_RE.test(l) &&
        !URL_RE.test(l) &&
        l.length >= 3 &&
        l.length <= 60
      )
      if (comp) return comp
    }
  }
  return null
}

function extractSkills(text) {
  const found = SKILLS_LIST.filter(skill => {
    // Escape special regex chars in the skill name
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Non-word boundary check: not immediately preceded/followed by a letter
    try {
      const re = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'i')
      return re.test(text)
    } catch {
      return text.toLowerCase().includes(skill.toLowerCase())
    }
  })
  return [...new Set(found)]
}

function extractLinkedIn(text) {
  const m = text.match(LINKEDIN_RE)
  if (!m) return null
  const raw = m[0]
  return raw.startsWith('http') ? raw : `https://www.${raw}`
}

function extractLocation(text) {
  const cities = [...INDIAN_CITIES, 'Remote', 'Hybrid']
  const re = new RegExp(`\\b(${cities.join('|')})\\b`, 'i')
  const m = text.match(re)
  return m ? m[0] : null
}
