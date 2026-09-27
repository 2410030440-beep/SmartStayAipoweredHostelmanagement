import { useState, type FormEvent } from 'react'
import { ArrowRight, Building2, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { registerUser } from './services'

function validEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function Signup() {
	const navigate = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const normalizedEmail = email.trim()
		if (!normalizedEmail || !password || !confirmPassword) {
			setError('Complete all fields to create your account.')
			return
		}
		if (!validEmail(normalizedEmail)) {
			setError('Enter a valid email address.')
			return
		}
		if (password.length < 8) {
			setError('Password must be at least 8 characters.')
			return
		}
		if (password !== confirmPassword) {
			setError('Passwords do not match.')
			return
		}

		setError('')
		setLoading(true)
		try {
			await registerUser(normalizedEmail, password)
			navigate('/student-login', { replace: true, state: { message: 'Account created successfully. Please log in.' } })
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : 'Unable to create your account right now.')
		} finally {
			setLoading(false)
		}
	}

	return <div className="login-page"><div className="login-art"><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><div><span className="badge dark">WELCOME TO A BETTER HOSTEL DAY</span><h1>Make space for<br /><em>what matters.</em></h1><p>Create your student account and join your SmartStay hostel workspace.</p></div><span className="login-art-foot">SmartStay / Campus operations, made clear.</span></div><div className="login-form"><span className="eyebrow">CREATE ACCOUNT</span><h2>Join SmartStay</h2><p className="muted">Create a student account to get started.</p><form className="auth-form" onSubmit={handleSubmit} noValidate><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" disabled={loading} /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" disabled={loading} /></label><label>Confirm password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Re-enter your password" disabled={loading} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" type="submit" disabled={loading}>{loading ? 'Creating account...' : <>Create account <ArrowRight size={16} /></>}</button></form><div className="auth-switch"><span>Already have an account?</span><Link to="/student-login">Student Login</Link></div><div className="login-note"><ShieldCheck size={17} /><span><strong>Student access only</strong><br />New public accounts are created with student permissions.</span></div></div></div>
}