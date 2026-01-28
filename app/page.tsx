'use client';

import { useState } from 'react';
import { ArrowRight, BarChart3, Brain, MessageSquare, PieChart, Sparkles, Wallet, Menu, X } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <img src="/BudgetAI.png" alt="AlphaWealth Logo" className={styles.logoIcon} />
            <span className={styles.logoText}>AlphaWealth</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navButton}>Features</a>
            <Link href="/login">
              <button className={styles.navButton}>Sign In</button>
            </Link>
            <Link href="/signup">
              <button className={styles.primaryButton}>Sign Up</button>
            </Link>
          </div>
          <button
            className={`${styles.navButton} md:hidden`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-2">
              <a href="#features" className={`${styles.navButton} block w-full text-left`}>Features</a>
              <Link href="/login">
                <button className={`${styles.navButton} block w-full text-left`}>Sign In</button>
              </Link>
              <Link href="/signup">
                <button className={`${styles.primaryButton} block w-full text-left`}>Sign Up</button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      <section className={styles.hero}>
        <div className={styles.badge}>
          <Sparkles className={styles.badgeIcon} />
          <span>AI-Powered Financial Intelligence</span>
        </div>
        <h1 className={styles.heroTitle}>
          Master Your Finances<br />with <span className={styles.gradient}>AI Intelligence</span>
        </h1>
        <p className={styles.heroDescription}>
          Track expenses, gain insights, and make smarter financial decisions with AI-powered budgeting that understands your spending patterns.
        </p>
        <div className={styles.heroButtons}>
          <span className={styles.arrow}>↓</span>
          <Link href="/login" className={styles.ctaButton}>
          Get started
        </Link>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresTitle}>Powerful Features for Smart Budgeting</h2>
          <p className={styles.featuresSubtitle}>Everything you need to take control of your financial future</p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <BarChart3 style={{ width: '24px', height: '24px' }} />
            </div>
            <h3 className={styles.featureTitle}>Dashboard Overview</h3>
            <p className={styles.featureDescription}>
              See your total income, expenses, and balance at a glance with intuitive monthly charts and real-time updates.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Wallet style={{ width: '24px', height: '24px' }} />
            </div>
            <h3 className={styles.featureTitle}>Expense & Income Tracking</h3>
            <p className={styles.featureDescription}>
              Effortlessly add, edit, and delete transactions with predefined categories for accurate financial tracking.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Brain style={{ width: '24px', height: '24px' }} />
            </div>
            <h3 className={styles.featureTitle}>AI Spending Insights</h3>
            <p className={styles.featureDescription}>
              Get personalized AI-generated spending tips and proactive alerts to help you budget smarter and save more.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Sparkles style={{ width: '24px', height: '24px' }} />
            </div>
            <h3 className={styles.featureTitle}>Smart Categorization</h3>
            <p className={styles.featureDescription}>
              AI automatically detects and assigns categories to your transactions, saving you time and ensuring accuracy.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <PieChart style={{ width: '24px', height: '24px' }} />
            </div>
            <h3 className={styles.featureTitle}>Monthly Summary</h3>
            <p className={styles.featureDescription}>
              Review your income vs. expenses through beautiful visual charts that make financial insights easy to understand.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <MessageSquare style={{ width: '24px', height: '24px' }} />
            </div>
            <h3 className={styles.featureTitle}>Natural Language Query</h3>
            <p className={styles.featureDescription}>
              Ask questions in plain English and get instant AI-generated answers about your finances and spending patterns.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.aiSection}>
        <div className={styles.aiContent}>
          <div>
            <h2 className={styles.aiTitle}>
              AI That Understands Your Financial Goals
            </h2>
            <p className={styles.aiDescription}>
              Our advanced AI engine learns your spending habits, identifies patterns, and provides actionable insights to help you achieve your financial goals faster.
            </p>
            <ul className={styles.aiFeatures}>
              {[
                'Intelligent expense categorization',
                'Personalized spending recommendations',
                'Proactive budget alerts',
                'Natural language financial queries'
              ].map((feature, i) => (
                <li key={i} className={styles.aiFeatureItem}>
                  <div className={styles.aiFeatureIcon}>
                    <ArrowRight style={{ width: '16px', height: '16px' }} />
                  </div>
                  <span className={styles.aiFeatureText}>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.aiExample}>
            <div className={styles.exampleItem}>
              <Brain className={styles.exampleIcon} />
              <div>
                <div className={styles.exampleTitle}>AI Insight</div>
                <p className={styles.exampleText}>
                  You've spent 23% more on dining out this month compared to last month. Consider meal prepping to save $180/month.
                </p>
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.exampleItem}>
              <MessageSquare className={styles.exampleIcon} />
              <div>
                <div className={styles.exampleTitle}>Quick Answer</div>
                <p className={styles.exampleQuery}>"How much did I spend on groceries last month?"</p>
                <p className={styles.exampleAnswer}>
                  You spent $487 on groceries in January, which is 15% below your average.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
