/**
 * Comprehensive Demo: WorkChain Freelance Collaboration Platform
 *
 * This demo showcases the full freelance project management system including:
 * - User registration (clients and contractors)
 * - Tax information and compliance
 * - Collaborative projects with team members
 * - Contribution tracking and credit earning
 * - Payment distribution with profit sharing
 * - Contractor agreements and compliance
 * - Notifications for all events
 */

import { Application } from '../core/Application';
import {
  UserRole,
  ProjectType,
  ContributionType,
  CollaborationRole,
  AgreementType,
  TaxFormType,
  VibeProjectType
} from '../types';

async function runDemo() {
  console.log('='.repeat(80));
  console.log('WorkChain: Freelance Collaboration Platform Demo');
  console.log('='.repeat(80));

  const app = Application.getInstance();

  // ==================== STEP 1: Create Users ====================
  console.log('\n1️⃣  Creating Users...\n');

  const userRepo = app.getUserProfileRepository();

  // Create Client
  const client = await userRepo.create({
    username: 'tech_startup_ceo',
    email: 'ceo@techstartup.com',
    displayName: 'Sarah Chen',
    roles: [UserRole.CLIENT],
    skills: [],
    bio: 'CEO of a tech startup looking to build innovative products',
    timezone: 'America/Los_Angeles',
    availability: 'full-time',
    rating: 0,
    completedProjects: 0,
    successRate: 100,
    responseTime: 2,
    verified: true,
    reputation: 0
  });
  console.log(`✅ Created Client: ${client.displayName} (@${client.username})`);

  // Create Lead Contractor
  const leadDev = await userRepo.create({
    username: 'senior_fullstack_dev',
    email: 'alex@devpro.com',
    displayName: 'Alex Martinez',
    roles: [UserRole.FREELANCER],
    skills: ['TypeScript', 'React', 'Node.js', 'AWS', 'PostgreSQL'],
    hourlyRate: 150,
    portfolioUrl: 'https://alexmartinez.dev',
    githubUsername: 'alexmartinez',
    bio: 'Senior full-stack developer with 10+ years experience',
    timezone: 'America/New_York',
    availability: 'contract',
    rating: 4.9,
    totalEarned: 250000,
    completedProjects: 45,
    successRate: 98,
    responseTime: 1,
    verified: true,
    reputation: 950
  });
  console.log(`✅ Created Lead Developer: ${leadDev.displayName} (@${leadDev.username})`);

  // Create Contributing Developers
  const frontendDev = await userRepo.create({
    username: 'react_specialist',
    email: 'jamie@frontend.io',
    displayName: 'Jamie Lee',
    roles: [UserRole.FREELANCER],
    skills: ['React', 'TypeScript', 'CSS', 'UI/UX'],
    hourlyRate: 100,
    githubUsername: 'jamielee',
    bio: 'Frontend specialist focused on React and modern UI',
    timezone: 'America/Chicago',
    availability: 'part-time',
    rating: 4.8,
    totalEarned: 85000,
    completedProjects: 32,
    successRate: 97,
    responseTime: 2,
    verified: true,
    reputation: 720
  });
  console.log(`✅ Created Frontend Dev: ${frontendDev.displayName} (@${frontendDev.username})`);

  const backendDev = await userRepo.create({
    username: 'api_architect',
    email: 'morgan@backend.dev',
    displayName: 'Morgan Taylor',
    roles: [UserRole.FREELANCER],
    skills: ['Node.js', 'PostgreSQL', 'Redis', 'Microservices'],
    hourlyRate: 120,
    githubUsername: 'morgantaylor',
    bio: 'Backend architect specializing in scalable APIs',
    timezone: 'America/Denver',
    availability: 'contract',
    rating: 4.9,
    totalEarned: 120000,
    completedProjects: 28,
    successRate: 100,
    responseTime: 1,
    verified: true,
    reputation: 840
  });
  console.log(`✅ Created Backend Dev: ${backendDev.displayName} (@${backendDev.username})`);

  // ==================== STEP 2: Tax Information & Compliance ====================
  console.log('\n2️⃣  Setting Up Tax Information & Compliance...\n');

  const taxService = app.getTaxService();
  const complianceService = app.getComplianceService();

  // Submit tax information for contractors
  const leadTaxInfo = await taxService.submitTaxInformation(
    leadDev.id,
    {
      formType: TaxFormType.W9,
      taxIdType: 'ssn',
      taxId: '123-45-6789',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      isUsCitizen: true
    },
    '/tax-forms/w9-alex-martinez.pdf',
    leadDev.id
  );
  console.log(`✅ Submitted W-9 for ${leadDev.displayName}`);

  await taxService.submitTaxInformation(
    frontendDev.id,
    {
      formType: TaxFormType.W9,
      taxIdType: 'ssn',
      taxId: '987-65-4321',
      address: {
        street: '456 Oak Ave',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA'
      },
      isUsCitizen: true
    },
    '/tax-forms/w9-jamie-lee.pdf',
    frontendDev.id
  );
  console.log(`✅ Submitted W-9 for ${frontendDev.displayName}`);

  await taxService.submitTaxInformation(
    backendDev.id,
    {
      formType: TaxFormType.W9,
      taxIdType: 'ssn',
      taxId: '555-12-3456',
      address: {
        street: '789 Pine Rd',
        city: 'Denver',
        state: 'CO',
        zipCode: '80201',
        country: 'USA'
      },
      isUsCitizen: true
    },
    '/tax-forms/w9-morgan-taylor.pdf',
    backendDev.id
  );
  console.log(`✅ Submitted W-9 for ${backendDev.displayName}`);

  // Verify tax information (admin action)
  await taxService.verifyTaxInformation(leadTaxInfo.id, 'admin');
  console.log(`✅ Verified tax information for all contractors`);

  // Check compliance
  const leadCompliance = await complianceService.checkCompliance(leadDev.id);
  console.log(`✅ Compliance status for ${leadDev.displayName}: ${leadCompliance.status}`);

  // ==================== STEP 3: Create Collaborative Project ====================
  console.log('\n3️⃣  Creating Collaborative Product Buildout Project...\n');

  const projectRepo = app.getProjectRepository();

  const project = await projectRepo.create({
    clientId: client.id,
    title: 'SaaS MVP: Project Management Platform',
    description: 'Build a modern project management SaaS platform with real-time collaboration, kanban boards, and team features.',
    projectType: ProjectType.EPIC,
    status: 'open',
    budget: {
      type: 'fixed',
      amount: 50000,
      currency: 'USD'
    },
    timeline: {
      estimatedHours: 400,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      milestones: []
    },
    requirements: [
      {
        id: 'req-1',
        title: 'User Authentication System',
        description: 'Secure auth with JWT, OAuth integrations',
        acceptanceCriteria: ['JWT implementation', 'GitHub OAuth', 'Password reset flow'],
        priority: 'high',
        category: 'functional'
      },
      {
        id: 'req-2',
        title: 'Real-time Kanban Board',
        description: 'Drag-and-drop kanban with WebSocket updates',
        acceptanceCriteria: ['Drag-drop interface', 'WebSocket sync', 'Mobile responsive'],
        priority: 'high',
        category: 'functional'
      },
      {
        id: 'req-3',
        title: 'Team Collaboration Features',
        description: 'Comments, mentions, notifications',
        acceptanceCriteria: ['Real-time comments', '@mentions', 'Push notifications'],
        priority: 'medium',
        category: 'functional'
      }
    ],
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'WebSocket', 'AWS'],
    attachments: [],
    proposals: []
  });
  console.log(`✅ Created Project: "${project.title}" ($${project.budget.amount.toLocaleString()})`);

  // Create collaborative project
  const collaborationService = app.getCollaborationService();
  const collabProject = await collaborationService.createCollaborativeProject(
    project.id,
    leadDev.id,
    {
      requireCodeReview: true,
      minimumReviewers: 1,
      autoApproveContributions: false,
      creditMultiplier: 1.5 // 50% bonus for this high-value project
    },
    'contribution-based'
  );
  console.log(`✅ Converted to Collaborative Project (contribution-based profit sharing)`);

  // ==================== STEP 4: Create Agreements ====================
  console.log('\n4️⃣  Creating Contractor Agreements...\n');

  const agreement = await complianceService.createAgreement(
    project.id,
    client.id,
    leadDev.id,
    AgreementType.INDEPENDENT_CONTRACTOR,
    {
      scope: 'Development of SaaS MVP platform as specified in project requirements',
      deliverables: [
        'Fully functional web application',
        'User authentication system',
        'Real-time kanban board',
        'Team collaboration features',
        'Deployment to production',
        'Documentation and handoff'
      ],
      paymentTerms: 'Payment distributed based on verified contributions. Platform fee: 10%',
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      terminationClauses: [
        'Either party may terminate with 14 days written notice',
        'Client retains all IP rights upon final payment',
        'Contractor entitled to payment for completed work'
      ],
      ipOwnership: 'client'
    },
    '/agreements/contract-saas-mvp.pdf',
    client.id
  );
  console.log(`✅ Created Independent Contractor Agreement`);

  // Sign agreement
  await complianceService.signAgreement(agreement.id, 'client', '192.168.1.1', client.id);
  await complianceService.signAgreement(agreement.id, 'contractor', '192.168.1.2', leadDev.id);
  console.log(`✅ Agreement signed by both parties`);

  // ==================== STEP 5: Invite Team Members ====================
  console.log('\n5️⃣  Building the Team...\n');

  await collaborationService.inviteTeamMember(
    project.id,
    frontendDev.id,
    CollaborationRole.CONTRIBUTOR,
    30, // 30% profit share
    frontendDev.hourlyRate,
    leadDev.id
  );
  console.log(`✅ Invited ${frontendDev.displayName} as Frontend Contributor (30% share)`);

  await collaborationService.inviteTeamMember(
    project.id,
    backendDev.id,
    CollaborationRole.CONTRIBUTOR,
    30, // 30% profit share
    backendDev.hourlyRate,
    leadDev.id
  );
  console.log(`✅ Invited ${backendDev.displayName} as Backend Contributor (30% share)`);

  // Update profit distribution (lead gets 40%)
  await collaborationService.updateProfitDistribution(
    project.id,
    {
      [leadDev.id]: 40,
      [frontendDev.id]: 30,
      [backendDev.id]: 30
    },
    leadDev.id
  );
  console.log(`✅ Updated profit distribution: Lead 40%, Frontend 30%, Backend 30%`);

  // ==================== STEP 6: Track Contributions & Earn Credits ====================
  console.log('\n6️⃣  Tracking Contributions & Earning Credits...\n');

  const creditService = app.getCreditService();

  // Lead dev: Architecture design
  const contrib1 = await creditService.createContribution(
    project.id,
    leadDev.id,
    ContributionType.ARCHITECTURE,
    'Designed system architecture, database schema, and API structure',
    {
      hoursSpent: 20,
      impactScore: 9
    },
    undefined,
    leadDev.id
  );
  await creditService.verifyContribution(contrib1.id, client.id);
  console.log(`✅ ${leadDev.displayName}: Architecture Design (+${contrib1.creditsEarned} credits)`);

  // Frontend dev: React components
  const contrib2 = await creditService.createContribution(
    project.id,
    frontendDev.id,
    ContributionType.CODE,
    'Implemented kanban board UI with drag-and-drop functionality',
    {
      linesOfCode: 1200,
      filesChanged: 15,
      commitsCount: 24,
      impactScore: 8
    },
    {
      platform: 'github',
      externalId: 'PR#42',
      url: 'https://github.com/techstartup/saas-mvp/pull/42'
    },
    frontendDev.id
  );
  await creditService.verifyContribution(contrib2.id, leadDev.id);
  console.log(`✅ ${frontendDev.displayName}: Kanban Board UI (+${contrib2.creditsEarned} credits)`);

  // Backend dev: API development
  const contrib3 = await creditService.createContribution(
    project.id,
    backendDev.id,
    ContributionType.CODE,
    'Built REST API with WebSocket support for real-time updates',
    {
      linesOfCode: 2000,
      filesChanged: 25,
      commitsCount: 38,
      impactScore: 9
    },
    {
      platform: 'github',
      externalId: 'PR#45',
      url: 'https://github.com/techstartup/saas-mvp/pull/45'
    },
    backendDev.id
  );
  await creditService.verifyContribution(contrib3.id, leadDev.id);
  console.log(`✅ ${backendDev.displayName}: Real-time API (+${contrib3.creditsEarned} credits)`);

  // Lead dev: Code reviews
  const contrib4 = await creditService.createContribution(
    project.id,
    leadDev.id,
    ContributionType.CODE_REVIEW,
    'Reviewed all PRs and provided feedback',
    {
      reviewsCompleted: 12,
      impactScore: 7
    },
    undefined,
    leadDev.id
  );
  await creditService.verifyContribution(contrib4.id, client.id);
  console.log(`✅ ${leadDev.displayName}: Code Reviews (+${contrib4.creditsEarned} credits)`);

  // Frontend dev: Testing
  const contrib5 = await creditService.createContribution(
    project.id,
    frontendDev.id,
    ContributionType.TESTING,
    'Wrote comprehensive test suite for UI components',
    {
      testsWritten: 45,
      impactScore: 7
    },
    undefined,
    frontendDev.id
  );
  await creditService.verifyContribution(contrib5.id, leadDev.id);
  console.log(`✅ ${frontendDev.displayName}: UI Testing (+${contrib5.creditsEarned} credits)`);

  // Bug fixes
  const contrib6 = await creditService.createContribution(
    project.id,
    backendDev.id,
    ContributionType.BUG_FIX,
    'Fixed critical WebSocket connection issues',
    {
      bugsFixed: 3,
      impactScore: 9
    },
    undefined,
    backendDev.id
  );
  await creditService.verifyContribution(contrib6.id, leadDev.id);
  console.log(`✅ ${backendDev.displayName}: Critical Bug Fixes (+${contrib6.creditsEarned} credits)`);

  // ==================== STEP 7: Payment Distribution ====================
  console.log('\n7️⃣  Distributing Payment Based on Contributions...\n');

  const paymentService = app.getPaymentService();

  // Calculate contribution-based distribution
  const distribution = await collaborationService.calculateContributionBasedDistribution(project.id);
  console.log('\n📊 Contribution-Based Distribution:');
  for (const [userId, percentage] of Object.entries(distribution)) {
    const user = await userRepo.findById(userId);
    console.log(`   ${user?.displayName}: ${percentage.toFixed(2)}%`);
  }

  // Create milestone payment
  const milestoneAmount = 15000; // First milestone: $15,000
  const payments = await collaborationService.distributePayment(
    project.id,
    'milestone-1',
    milestoneAmount,
    client.id,
    client.id
  );

  console.log(`\n💰 Distributed $${milestoneAmount.toLocaleString()} milestone payment:`);
  for (const payment of payments) {
    const user = await userRepo.findById(payment.userId);
    console.log(`   ${user?.displayName}: $${payment.amount.toFixed(2)}`);

    // Escrow the payment
    await paymentService.escrowPayment(payment.paymentId, 'txn_' + payment.paymentId, client.id);
  }

  // Release payments after milestone approval
  for (const payment of payments) {
    await paymentService.releasePayment(payment.paymentId, client.id);
    const user = await userRepo.findById(payment.userId);

    // Send notification
    const notificationService = app.getNotificationService();
    await notificationService.notifyPaymentReceived(
      payment.userId,
      payment.amount,
      'USD',
      project.id,
      project.title
    );
  }
  console.log(`✅ All payments released and contractors notified`);

  // ==================== STEP 8: Show Statistics ====================
  console.log('\n8️⃣  Platform Statistics...\n');

  // User credits
  const leadCredits = await creditService.getUserCredits(leadDev.id);
  console.log(`💎 ${leadDev.displayName} Credits:`);
  console.log(`   Balance: ${leadCredits.balance.currentBalance} credits`);
  console.log(`   Lifetime Earned: ${leadCredits.balance.lifetimeContributions} credits`);
  console.log(`   Contributions: ${leadCredits.contributionStats.totalContributions}`);

  const frontendCredits = await creditService.getUserCredits(frontendDev.id);
  console.log(`\n💎 ${frontendDev.displayName} Credits:`);
  console.log(`   Balance: ${frontendCredits.balance.currentBalance} credits`);
  console.log(`   Lifetime Earned: ${frontendCredits.balance.lifetimeContributions} credits`);

  const backendCredits = await creditService.getUserCredits(backendDev.id);
  console.log(`\n💎 ${backendDev.displayName} Credits:`);
  console.log(`   Balance: ${backendCredits.balance.currentBalance} credits`);
  console.log(`   Lifetime Earned: ${backendCredits.balance.lifetimeContributions} credits`);

  // Team stats
  const teamStats = await collaborationService.getTeamStats(project.id);
  console.log(`\n👥 Team Statistics:`);
  console.log(`   Total Members: ${teamStats.totalMembers}`);
  console.log(`   Total Contributions: ${teamStats.totalContributions}`);
  console.log(`   Total Credits Earned: ${teamStats.totalCreditsEarned}`);

  // Credit leaderboard
  const leaderboard = await creditService.getLeaderboard(5);
  console.log(`\n🏆 Credit Leaderboard:`);
  leaderboard.forEach((entry, i) => {
    const user = userRepo.findById(entry.userId);
    user.then(u => {
      console.log(`   ${i + 1}. ${u?.displayName}: ${entry.balance.lifetimeContributions} credits`);
    });
  });

  // Platform stats
  const platformStats = await app.getStats();
  console.log(`\n📈 Platform Statistics:`);
  console.log(`   Total Blockchain Blocks: ${platformStats.blockchain.totalBlocks}`);
  console.log(`   Total Credits Issued: ${platformStats.credits.totalCredits.totalIssued}`);
  console.log(`   Total Contributions: ${platformStats.credits.totalContributions}`);

  // ==================== STEP 9: Tax Calculation ====================
  console.log('\n9️⃣  Tax Calculations...\n');

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const leadTaxLiability = await taxService.calculateTaxLiability(
    leadDev.id,
    currentYear,
    currentQuarter
  );
  console.log(`📋 ${leadDev.displayName} Tax Liability (Q${currentQuarter} ${currentYear}):`);
  console.log(`   Total Income: $${leadTaxLiability.totalIncome.toFixed(2)}`);
  console.log(`   Estimated Tax Owed: $${leadTaxLiability.estimatedTaxOwed.toFixed(2)}`);
  console.log(`   Tax Reserve Recommended: $${leadTaxLiability.taxReserve.toFixed(2)}`);

  console.log('\n' + '='.repeat(80));
  console.log('Demo completed successfully!');
  console.log('='.repeat(80));
}

// Run the demo
runDemo().catch(console.error);
