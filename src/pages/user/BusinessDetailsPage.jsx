import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import OnboardingLayout from '../../components/layout/OnboardingLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { businessApi, ApiError } from '../../lib/api.js'

function VerificationPending() {
  return (
    <div className="mx-auto max-w-xl">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Setup Your Business</p>
      <h1 className="mt-1 text-center text-xl font-bold text-slate-900">User Business Details</h1>

      <Card className="mt-6 border border-slate-200 bg-surface-bg p-6 shadow-none md:p-10">
        <Card className="mx-auto max-w-sm p-8 text-center shadow-soft">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h2 className="mt-4 text-base font-bold text-slate-900">Verification Pending</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your details have been submitted. Your account will be activated once the admin approves it.
          </p>
        </Card>
      </Card>
    </div>
  )
}

function BusinessDetailsForm({ profile, onSubmit, submitting, error }) {
  return (
    <Card className="mx-auto max-w-4xl p-6 shadow-soft">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary">
            {profile.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{profile.name}</p>
            <p className="text-xs text-slate-400">{profile.email}</p>
          </div>
        </div>
        <Button
          type="submit"
          form="user-business-details-form"
          size="sm"
          className="w-full sm:w-auto"
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <form id="user-business-details-form" onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="businessName" name="businessName" label="Business Name" placeholder="Business Name" required />
          <Input
            id="businessDescription"
            name="businessDescription"
            label="Business Description"
            placeholder="Describe your business"
          />
          <Select id="businessCategory" name="businessCategory" label="Business Category" defaultValue="" required>
            <option value="" disabled>
              Select Category
            </option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
            <option value="service">Service</option>
          </Select>
          <Input
            id="businessEmail"
            name="businessEmail"
            label="Business Email"
            type="email"
            placeholder="Enter Business Email"
          />
          <Input
            id="businessAddress"
            name="businessAddress"
            label="Business Address"
            placeholder="Business Address"
            containerClassName="sm:col-span-2"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input id="country" name="country" label="Country" placeholder="Country" />
          <Input id="city" name="city" label="City" placeholder="City" />
          <Select id="orderType" name="orderType" label="Order Type" defaultValue="delivery">
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup</option>
          </Select>
        </div>
      </form>
    </Card>
  )
}

function UserBusinessDetailsPage() {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(user?.status)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const data = await businessApi.getMine()
        if (!active) return
        updateUser(data.user)
        setStatus(data.user.status)
      } catch {
        if (active) setStatus(user?.status)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [updateUser, user?.status])

  if (user?.status === 'approved') {
    return <Navigate to="/user/dashboard" replace />
  }

  if (loading) {
    return (
      <OnboardingLayout topbarName={user?.fullName || 'User'}>
        <p className="text-center text-sm text-slate-500">Loading…</p>
      </OnboardingLayout>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      const data = await businessApi.submit(payload)
      updateUser(data.user)
      setStatus(data.user.status)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit business details.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OnboardingLayout topbarName={user?.fullName || 'User'}>
      {status === 'pending_approval' ? (
        <VerificationPending />
      ) : (
        <BusinessDetailsForm
          profile={{ name: user?.fullName || 'User', email: user?.email || '' }}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      )}
    </OnboardingLayout>
  )
}

export default UserBusinessDetailsPage
