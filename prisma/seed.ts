import { PrismaClient, QuestionType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const departments = [
  {
    name: 'Broadcast Department',
    slug: 'broadcast',
    description: 'Commentate and stream live RPL games to the community.',
    icon: '🎙️',
    sortOrder: 0,
    questions: [
      { label: 'Do you have prior broadcasting or commentary experience?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 0 },
      { label: 'What broadcasting software are you comfortable with?', type: QuestionType.SHORT_TEXT, required: true, sortOrder: 1 },
      { label: 'What is your timezone and availability for games?', type: QuestionType.SHORT_TEXT, required: true, sortOrder: 2 },
      { label: 'Why do you want to join the Broadcast Department?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 3, charLimit: 1000 },
    ],
  },
  {
    name: 'Graphics Department',
    slug: 'graphics',
    description: 'Design graphics, overlays, and visual content for the league.',
    icon: '🎨',
    sortOrder: 1,
    questions: [
      { label: 'What design software do you use?', type: QuestionType.MULTIPLE_CHOICE, options: ['Photoshop', 'Illustrator', 'Figma', 'Canva', 'Other'], required: true, sortOrder: 0 },
      { label: 'Link your portfolio or examples of past work', type: QuestionType.SHORT_TEXT, required: true, sortOrder: 1 },
      { label: 'How many hours per week can you dedicate to graphics work?', type: QuestionType.DROPDOWN, options: ['1-3 hours', '3-5 hours', '5-10 hours', '10+ hours'], required: true, sortOrder: 2 },
      { label: 'Describe your design style and how it fits RPL', type: QuestionType.LONG_TEXT, required: true, sortOrder: 3, charLimit: 800 },
    ],
  },
  {
    name: 'Justice Department',
    slug: 'justice',
    description: 'Moderate disputes, review appeals, and enforce league rules.',
    icon: '⚖️',
    sortOrder: 2,
    questions: [
      { label: 'Have you held a moderation or administrative role before?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 0 },
      { label: 'How would you handle a dispute between two franchise owners?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 1, charLimit: 1200 },
      { label: 'Do you commit to remaining impartial when reviewing cases?', type: QuestionType.MULTIPLE_CHOICE, options: ['Yes, absolutely', 'Yes, with exceptions for conflicts of interest', 'No'], required: true, sortOrder: 2 },
      { label: 'Why should RPL trust you with justice responsibilities?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 3, charLimit: 1000 },
    ],
  },
  {
    name: 'Mastersheet Department',
    slug: 'mastersheet',
    description: 'Maintain salary sheets, rosters, and league data systems.',
    icon: '📊',
    sortOrder: 3,
    questions: [
      { label: 'How proficient are you with Google Sheets or Excel?', type: QuestionType.DROPDOWN, options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], required: true, sortOrder: 0 },
      { label: 'Describe any experience managing large datasets or rosters', type: QuestionType.LONG_TEXT, required: true, sortOrder: 1 },
      { label: 'Are you familiar with formulas, conditional formatting, and macros?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 2 },
      { label: 'Why do you want to join the Mastersheet Department?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 3, charLimit: 800 },
    ],
  },
  {
    name: 'Media Department',
    slug: 'media',
    description: 'Produce content, highlights, and social media posts for RPL.',
    icon: '📸',
    sortOrder: 4,
    questions: [
      { label: 'What type of media content can you produce?', type: QuestionType.CHECKBOX, options: ['Video editing', 'Photo editing', 'Social media posts', 'Highlight reels', 'Thumbnails'], required: true, sortOrder: 0 },
      { label: 'Link examples of your previous media work', type: QuestionType.SHORT_TEXT, required: true, sortOrder: 1 },
      { label: 'What tools do you use for video/photo editing?', type: QuestionType.SHORT_TEXT, required: true, sortOrder: 2 },
      { label: 'How would you grow RPL media presence?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 3, charLimit: 1000 },
    ],
  },
  {
    name: 'Referee Department',
    slug: 'referee',
    description: 'Officiate RPL games and uphold competitive integrity.',
    icon: '🏀',
    sortOrder: 5,
    questions: [
      { label: 'Have you refereed games in RPL or similar leagues before?', type: QuestionType.MULTIPLE_CHOICE, options: ['Yes, RPL specifically', 'Yes, in other leagues', 'No, but I have extensive knowledge', 'No experience'], required: true, sortOrder: 0 },
      { label: 'How well do you know the RPL rulebook?', type: QuestionType.DROPDOWN, options: ['Expert – could explain any rule', 'Proficient – know most rules well', 'Familiar – know the basics', 'Beginner – still learning'], required: true, sortOrder: 1 },
      { label: 'What is your availability during peak game times?', type: QuestionType.SHORT_TEXT, required: true, sortOrder: 2 },
      { label: 'How do you handle pressure in a disputed call situation?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 3, charLimit: 1000 },
    ],
  },
]

const franchiseQuestions = [
  { label: 'Which NBA franchise are you applying to own?', type: QuestionType.SHORT_TEXT, required: true, sortOrder: 0, isFranchise: true },
  { label: 'Have you owned or managed a franchise in a previous RPL season?', type: QuestionType.MULTIPLE_CHOICE, options: ['Yes – multiple seasons', 'Yes – one season', 'No, this is my first time'], required: true, sortOrder: 1, isFranchise: true },
  { label: 'Describe your experience managing a sports team or organization', type: QuestionType.LONG_TEXT, required: true, sortOrder: 2, isFranchise: true, charLimit: 1200 },
  { label: 'How do you plan to build and manage your roster this season?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 3, isFranchise: true, charLimit: 1200 },
  { label: 'What makes you the right person to represent this franchise?', type: QuestionType.LONG_TEXT, required: true, sortOrder: 4, isFranchise: true, charLimit: 1000 },
  { label: 'How many hours per week can you commit to franchise duties?', type: QuestionType.DROPDOWN, options: ['5-10 hours', '10-20 hours', '20-30 hours', '30+ hours'], required: true, sortOrder: 5, isFranchise: true },
]

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminUsername || !adminPassword) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables. No defaults allowed.')
  }

  console.log('Seeding database...')

  const hash = await bcrypt.hash(adminPassword, 12)
  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { password: hash },
    create: { username: adminUsername, password: hash },
  })
  console.log('✓ Admin user created')

  await prisma.franchiseConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', isOpen: false },
  })

  for (const dept of departments) {
    const { questions, ...deptData } = dept
    const created = await prisma.department.upsert({
      where: { slug: deptData.slug },
      update: { ...deptData },
      create: { ...deptData },
    })
    await prisma.question.deleteMany({ where: { departmentId: created.id } })
    for (const q of questions) {
      await prisma.question.create({ data: { ...q, departmentId: created.id } })
    }
    console.log(`✓ ${deptData.name}`)
  }

  await prisma.question.deleteMany({ where: { isFranchise: true } })
  for (const q of franchiseQuestions) {
    await prisma.question.create({ data: q })
  }
  console.log('✓ Franchise questions')

  console.log('\nSeed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
