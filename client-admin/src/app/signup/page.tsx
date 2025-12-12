"use client"

import type React from "react"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Lock, Mail, Eye, EyeOff, AlertCircle, Phone, CheckCircle, Circle } from "lucide-react"
import { api } from "@/lib/api"
import { motion } from "framer-motion"
import Image from "next/image"

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    companyId: "", // Add company selection
  })
  const [companies, setCompanies] = useState<any[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(`${API_URL}/companies`)
        if (response.ok) {
          const data = await response.json()
          setCompanies(data)
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error)
      } finally {
        setLoadingCompanies(false)
      }
    }
    fetchCompanies()
  }, [])

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Phone number validation function
  const validatePhone = (phone: string): boolean => {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, "")
    // Check if it has between 8 and 15 digits (international format)
    return digitsOnly.length >= 8 && digitsOnly.length <= 15
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.push("Please enter a valid email address")
    }

    if (formData.username.length < 3) {
      newErrors.push("Username must be at least 3 characters long")
    }

    if (!formData.name) {
      newErrors.push("Please enter a name")
    }

    if (!formData.phone || !validatePhone(formData.phone)) {
      newErrors.push("Please enter a valid phone number (8-15 digits)")
    }

    if (formData.password.length < 6) {
      newErrors.push("Password must be at least 6 characters long")
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push("Passwords do not match")
    }

    if (!formData.companyId) {
      newErrors.push("Please select a company")
    }

    if (!acceptedTerms) {
      newErrors.push("You must accept the Terms and Privacy Policy to continue")
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors([])
    try {
      await api.post("/auth/register-admin", {
        email: formData.email,
        username: formData.username,
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        companyId: formData.companyId,
      })
      router.push("/")
    } catch (err: any) {
      setErrors([err?.response?.data?.error || "Registration failed. Please try again."])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear related errors when user starts typing
    if (errors.length > 0) {
      setErrors((prevErrors) => {
        const filteredErrors = prevErrors.filter((error) => {
          if (field === "email" && error.includes("email")) return false
          if (field === "phone" && error.includes("phone")) return false
          return true
        })
        return filteredErrors
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 relative overflow-hidden flex items-center justify-center">
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-100 rounded-full transform translate-y-1/2 -translate-x-1/4 opacity-80"></div>
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-red-600 rounded-full transform translate-x-1/3 -translate-y-1/4 opacity-60"></div>
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-yellow-200 rounded-full transform -translate-y-1/2 opacity-80"></div>
      <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-red-500 rounded-full transform translate-y-1/4 opacity-40"></div>

      {/* Animated mosquito silhouettes */}
      <motion.div
        className="absolute top-20 left-1/4 text-red-300/20"
        animate={{
          y: [0, 10, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 4,
          ease: "easeInOut",
        }}
      >
        <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2ZM21 9V7L19 8L17 7V9L19 10L21 9ZM7 7V9L5 10L3 9V7L5 8L7 7ZM12 8C9.8 8 8 9.8 8 12C8 14.2 9.8 16 12 16C14.2 16 16 14.2 16 12C16 9.8 14.2 8 12 8ZM12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14ZM12 18C10.9 18 10 18.9 10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20C14 18.9 13.1 18 12 18Z" />
        </svg>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8 w-full max-w-md">
        {/* Title */}
        <motion.div
          className="absolute top-8 left-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-white text-3xl font-bold">
            Drone4Dengue
            <br />
            <span className="text-yellow-300">Admin</span>
          </h1>
        </motion.div>

        {/* Sign up form container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
            <CardContent className="space-y-6 p-8">
              {/* Mosquito icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  className="w-28 h-28 rounded-lg flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Image
                    src="/images/drone4dengue-logo.png"
                    alt="Drone4Dengue Logo"
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </motion.div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
                <p className="text-white/70 text-sm">Join the Drone4Dengue admin platform</p>
              </div>

              {/* Error messages */}
              {errors.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <Alert className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-white rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-300" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 ml-1">
                        {errors.map((error, index) => (
                          <li key={index} className="text-sm">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Sign up form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80 text-sm">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value && !validateEmail(e.target.value)) {
                          setErrors((prevErrors) => {
                            const errorMsg = "Please enter a valid email address"
                            if (prevErrors.includes(errorMsg)) return prevErrors
                            return [...prevErrors, errorMsg]
                          })
                        } else {
                          setErrors((prevErrors) =>
                            prevErrors.filter((error) => !error.includes("email"))
                          )
                        }
                      }}
                      className="pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white/80 text-sm">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                    <Input
                      id="name"
                      type="text"
                      placeholder=""
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
                

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white/80 text-sm">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                    <Input
                      id="username"
                      type="text"
                      placeholder=""
                      required
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      className="pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white/80 text-sm">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value && !validatePhone(e.target.value)) {
                          setErrors((prevErrors) => {
                            const errorMsg = "Please enter a valid phone number (8-15 digits)"
                            if (prevErrors.includes(errorMsg)) return prevErrors
                            return [...prevErrors, errorMsg]
                          })
                        } else {
                          setErrors((prevErrors) =>
                            prevErrors.filter((error) => !error.includes("phone"))
                          )
                        }
                      }}
                      className="pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-white/80 text-sm">
                    Company
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                    <select
                      id="company"
                      required
                      value={formData.companyId}
                      onChange={(e) => handleInputChange("companyId", e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={loadingCompanies}
                    >
                      <option value="" className="bg-gray-800 text-white">
                        {loadingCompanies ? "Loading companies..." : "Select a company"}
                      </option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id} className="bg-gray-800 text-white">
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80 text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder=""
                      required
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pl-12 pr-12 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white/80 text-sm">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder=""
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pl-12 pr-12 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setAcceptedTerms(!acceptedTerms)}
                    className="mt-0.5 focus:outline-none focus:ring-2 focus:ring-white/40 rounded"
                    aria-label="Accept Terms and Privacy Policy"
                  >
                    {acceptedTerms ? (
                      <CheckCircle className="text-white h-5 w-5 cursor-pointer hover:text-gray-200 transition-colors" />
                    ) : (
                      <Circle className="text-white/70 h-5 w-5 cursor-pointer hover:text-white transition-colors" />
                    )}
                  </button>
                  <span className="text-white/70 text-xs leading-relaxed">
                    By signing up, you agree to our{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-white underline hover:text-gray-200 transition-colors font-semibold"
                    >
                      Terms and Privacy Policy
                    </Link>
                  </span>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-white to-white text-red-900 font-semibold rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all shadow-lg disabled:opacity-70"
                  >
                    {isLoading ? "CREATING ACCOUNT..." : "SIGN UP"}
                  </Button>
                </motion.div>
              </form>

              {/* Login link */}
              <div className="text-center">
                <span className="text-white/70 text-sm">{"Already have an account? "}</span>
                <Link
                  href="/"
                  className="text-white font-semibold hover:text-gray-200 transition-colors text-sm"
                >
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute bottom-4 text-white/50 text-xs text-center"
        >
          © 2025 Drone4Dengue. All rights reserved.
        </motion.div>
      </div>
    </div>
  )
}
