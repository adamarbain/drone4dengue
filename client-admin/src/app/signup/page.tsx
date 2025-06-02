"use client"

import type React from "react"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react"

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<string[]>([])

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.email.includes("@")) {
      newErrors.push("Please enter a valid email address")
    }

    if (formData.username.length < 3) {
      newErrors.push("Username must be at least 3 characters long")
    }

    if (formData.password.length < 6) {
      newErrors.push("Password must be at least 6 characters long")
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push("Passwords do not match")
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    // Simulate signup process
    setTimeout(() => setIsLoading(false), 2000)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors.length > 0) {
      setErrors([])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 relative overflow-hidden">
      {/* Decorative curved shapes */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-100 rounded-full transform translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-red-600 rounded-full transform translate-x-1/3 -translate-y-1/4 opacity-60"></div>
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-yellow-200 rounded-full transform -translate-y-1/2 opacity-80"></div>
      <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-red-500 rounded-full transform translate-y-1/4 opacity-40"></div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        {/* Title */}
        <div className="absolute top-8 left-8">
          <h1 className="text-white text-3xl font-bold">
            Drone4Dengue
            <br />
            Admin
          </h1>
        </div>

        {/* Sign up form container */}
        <Card className="w-full max-w-md bg-transparent border-none shadow-none">
          <CardContent className="space-y-6 p-0">
            {/* Mosquito icon */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-black" fill="currentColor">
                  <path d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2ZM21 9V7L19 8L17 7V9L19 10L21 9ZM7 7V9L5 10L3 9V7L5 8L7 7ZM12 8C9.8 8 8 9.8 8 12C8 14.2 9.8 16 12 16C14.2 16 16 14.2 16 12C16 9.8 14.2 8 12 8ZM12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14ZM12 18C10.9 18 10 18.9 10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20C14 18.9 13.1 18 12 18Z" />
                </svg>
              </div>
            </div>

            {/* Error messages */}
            {errors.length > 0 && (
              <Alert className="bg-red-100 border-red-300 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Sign up form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="sr-only">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="EMAIL ADDRESS"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent border-2 border-red-300 rounded-md text-white placeholder-red-300 focus:border-red-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="sr-only">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="USERNAME"
                    required
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent border-2 border-red-300 rounded-md text-white placeholder-red-300 focus:border-red-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="sr-only">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="PASSWORD"
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-transparent border-2 border-red-300 rounded-md text-white placeholder-red-300 focus:border-red-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-red-300 hover:text-red-200 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="CONFIRM PASSWORD"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-transparent border-2 border-red-300 rounded-md text-white placeholder-red-300 focus:border-red-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-red-300 hover:text-red-200 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-white text-red-800 font-semibold rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {isLoading ? "CREATING ACCOUNT..." : "SIGN UP"}
              </Button>
            </form>

            {/* Login link */}
            <div className="text-center mt-6">
              <span className="text-white text-sm">{"Already have an account? "}</span>
              <Link
                href="/"
                className="text-white font-semibold hover:text-red-200 transition-colors underline text-sm"
              >
                Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
