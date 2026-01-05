"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-blue to-accent-blue relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-light-bg rounded-full transform translate-y-1/2 -translate-x-1/4 opacity-80"></div>
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-accent-blue rounded-full transform translate-x-1/3 -translate-y-1/4 opacity-60"></div>
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-light-bg rounded-full transform -translate-y-1/2 opacity-80"></div>
      <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-secondary-blue rounded-full transform translate-y-1/4 opacity-40"></div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-white text-4xl font-bold mb-2">
              Drone4Dengue Terms and Privacy Policy
            </h1>
            <p className="text-white/70 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
              <CardContent className="p-8 space-y-8">
                {/* Terms of Service */}
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Terms of Service</h2>
                  <div className="space-y-4 text-white/90">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">1. Acceptance of Terms</h3>
                      <p className="text-sm leading-relaxed">
                        By accessing and using the Drone4Dengue Admin Platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">2. Use License</h3>
                      <p className="text-sm leading-relaxed">
                        Permission is granted to temporarily use the Drone4Dengue Admin Platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                      </p>
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm">
                        <li>Modify or copy the materials</li>
                        <li>Use the materials for any commercial purpose or for any public display</li>
                        <li>Attempt to reverse engineer any software contained in the platform</li>
                        <li>Remove any copyright or other proprietary notations from the materials</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">3. User Account</h3>
                      <p className="text-sm leading-relaxed">
                        You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">4. Data Collection and Usage</h3>
                      <p className="text-sm leading-relaxed">
                        The platform collects and processes data related to dengue fever monitoring, drone operations, and related analytics. By using the platform, you consent to the collection and use of this information in accordance with our Privacy Policy.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">5. Limitation of Liability</h3>
                      <p className="text-sm leading-relaxed">
                        In no event shall Drone4Dengue or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the platform.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Privacy Policy */}
                <section className="border-t border-white/20 pt-8">
                  <h2 className="text-2xl font-bold text-white mb-4">Privacy Policy</h2>
                  <div className="space-y-4 text-white/90">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">1. Information We Collect</h3>
                      <p className="text-sm leading-relaxed mb-2">
                        We collect information that you provide directly to us, including:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                        <li>Account information (name, email, username, phone number)</li>
                        <li>Company information and affiliation</li>
                        <li>Usage data and analytics</li>
                        <li>Drone operation data and location information</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">2. How We Use Your Information</h3>
                      <p className="text-sm leading-relaxed">
                        We use the information we collect to:
                      </p>
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm">
                        <li>Provide, maintain, and improve our services</li>
                        <li>Process your registration and manage your account</li>
                        <li>Send you technical notices and support messages</li>
                        <li>Monitor and analyze trends and usage</li>
                        <li>Detect, prevent, and address technical issues</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">3. Information Sharing</h3>
                      <p className="text-sm leading-relaxed">
                        We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                      </p>
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm">
                        <li>With your consent</li>
                        <li>To comply with legal obligations</li>
                        <li>To protect our rights and safety</li>
                        <li>With service providers who assist us in operating our platform</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">4. Data Security</h3>
                      <p className="text-sm leading-relaxed">
                        We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">5. Your Rights</h3>
                      <p className="text-sm leading-relaxed">
                        You have the right to:
                      </p>
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm">
                        <li>Access and receive a copy of your personal data</li>
                        <li>Rectify inaccurate or incomplete data</li>
                        <li>Request deletion of your personal data</li>
                        <li>Object to processing of your personal data</li>
                        <li>Request restriction of processing</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">6. Cookies and Tracking</h3>
                      <p className="text-sm leading-relaxed">
                        We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">7. Changes to This Policy</h3>
                      <p className="text-sm leading-relaxed">
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Contact Information */}
                <section className="border-t border-white/20 pt-8">
                  <h2 className="text-xl font-bold text-white mb-2">Contact Us</h2>
                  <p className="text-sm text-white/90 leading-relaxed">
                    If you have any questions about these Terms and Privacy Policy, please contact us through your company administrator or the platform support team.
                  </p>
                </section>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

