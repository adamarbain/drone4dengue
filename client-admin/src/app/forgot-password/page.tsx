"use client"

import type React from "react"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, CheckCircle, Key, Lock, Eye, EyeOff } from "lucide-react"
import { api } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const validatePassword = (password: string) => /^(?=.*\d).{8,}$/.test(password)

  // Step 1: Request reset code
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      await api.post("/auth/reset-request", { email })
      setStep(2)
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to send reset code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify code
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      await api.post("/auth/reset-verify", { email, code })
      setStep(3)
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid or expired code.")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Set new password
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    if (!validatePassword(newPassword)) {
      setError("Password must be at least 8 characters, including a number.")
      setIsLoading(false)
      return
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.")
      setIsLoading(false)
      return
    }
    try {
      await api.post("/auth/reset", { email, code, newPassword })
      setSuccess("Password reset successful! You can now log in.")
      setStep(4)
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to reset password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-blue to-accent-blue relative overflow-hidden">
      {/* Decorative curved shapes */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-light-bg rounded-full transform translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-accent-blue rounded-full transform translate-x-1/3 -translate-y-1/4 opacity-60"></div>
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-light-bg rounded-full transform -translate-y-1/2 opacity-80"></div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Title */}
        <div className="absolute top-8 left-8">
          <h1 className="text-white text-3xl font-bold">
            Drone4Dengue
            <br />
            Admin
          </h1>
        </div>

        {/* Back button */}
        <div className="absolute top-8 right-8">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:text-light-bg hover:bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>

        {/* Forgot password form container */}
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">Reset Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <form onSubmit={handleRequest} className="space-y-4">
                <p className="text-white/80 text-sm text-center">
                  Enter your email address and we'll send you a code to reset your password.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="email" className="sr-only">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-bg w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      placeholder=""
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-transparent border-2 border-white/20 rounded-md text-white placeholder-white/50 focus:border-accent-blue focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
                {error && <div className="text-center text-red-200 text-sm font-semibold">{error}</div>}
                <Button type="submit" disabled={isLoading} className="w-full py-3 bg-white text-primary-dark font-semibold rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {isLoading ? "SENDING..." : "SEND CODE"}
                </Button>
              </form>
            )}
            {step === 2 && (
              <form onSubmit={handleVerify} className="space-y-4">
                <p className="text-white/80 text-sm text-center">
                  Enter the code sent to your email.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="code" className="sr-only">Reset Code</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-bg w-5 h-5" />
                    <Input
                      id="code"
                      type="text"
                      placeholder=""
                      required
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-transparent border-2 border-white/20 rounded-md text-white placeholder-white/50 focus:border-accent-blue focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
                {error && <div className="text-center text-red-200 text-sm font-semibold">{error}</div>}
                <Button type="submit" disabled={isLoading} className="w-full py-3 bg-white text-primary-dark font-semibold rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {isLoading ? "VERIFYING..." : "VERIFY CODE"}
                </Button>
              </form>
            )}
            {step === 3 && (
              <form onSubmit={handleReset} className="space-y-4">
                <p className="text-white/80 text-sm text-center">
                  Enter your new password.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="sr-only">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-bg w-5 h-5" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="NEW PASSWORD"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 bg-transparent border-2 border-white/20 rounded-md text-white placeholder-white/50 focus:border-accent-blue focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-transparent"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="sr-only">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-bg w-5 h-5" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="CONFIRM PASSWORD"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 bg-transparent border-2 border-white/20 rounded-md text-white placeholder-white/50 focus:border-accent-blue focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-transparent"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {error && <div className="text-center text-red-200 text-sm font-semibold">{error}</div>}
                <Button type="submit" disabled={isLoading} className="w-full py-3 bg-white text-primary-dark font-semibold rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {isLoading ? "RESETTING..." : "RESET PASSWORD"}
                </Button>
              </form>
            )}
            {step === 4 && (
              <Alert className="bg-green-100 border-green-300 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {success || "Password reset successful! You can now log in."}
                </AlertDescription>
              </Alert>
            )}
            <div className="text-center">
              <Link href="/" className="text-white hover:text-light-bg transition-colors text-sm">
                Remember your password? Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
