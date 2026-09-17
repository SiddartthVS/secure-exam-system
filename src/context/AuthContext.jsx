/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  PREDEFINED_REGIONS,
  PREDEFINED_ADMIN,
  PREDEFINED_CENTRES
} from '../data/predefinedData'
import { logAuditEvent } from '../services/examService'

const AuthContext = createContext(null)

const AUTH_STORAGE_KEY = 'ses_auth_session'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            // Fetch user profile from database
            const { data: profile } = await supabase
              .from('profiles')
              .select('*, regions(*), exam_centres(*)')
              .eq('id', session.user.id)
              .maybeSingle()

            if (profile) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                role: profile.role,
                region: profile.regions || null,
                centre: profile.exam_centres || null,
                name: profile.regions?.name || profile.exam_centres?.name || profile.email
              })
            }
          }
        } else {
          // Check local stored session for mock mode
          const cached = localStorage.getItem(AUTH_STORAGE_KEY)
          if (cached) {
            setUser(JSON.parse(cached))
          }
        }
      } catch (err) {
        console.error('Failed initializing auth:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen to Supabase auth state changes if configured
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (!session) {
            setUser(null)
          }
        }
      )
      return () => subscription.unsubscribe()
    }
  }, [])

  /**
   * Region Login
   * Requires: selected region + correct region code
   */
  const loginAsRegion = async (regionId, enteredCode, password) => {
    const targetRegion = PREDEFINED_REGIONS.find((r) => r.id === regionId)
    if (!targetRegion) {
      throw new Error('Selected region does not exist.')
    }

    // Strict Region Code verification
    if (enteredCode.trim().toUpperCase() !== targetRegion.region_code.toUpperCase()) {
      throw new Error(
        `Invalid Region Code for ${targetRegion.name}. Access denied.`
      )
    }

    const effectivePassword = password || targetRegion.password

    if (isSupabaseConfigured) {
      // Authenticate via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetRegion.email,
        password: effectivePassword
      })

      if (authError) {
        throw new Error('Supabase Auth error: ' + authError.message)
      }

      // Fetch profile with regions joined
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, regions(*)')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile || profile.role !== 'region') {
        await supabase.auth.signOut()
        throw new Error('Authorization failed: User account does not have regional permissions.')
      }

      // Verify region code matches
      const dbRegion = profile.regions
      if (dbRegion && dbRegion.region_code.toUpperCase() !== targetRegion.region_code.toUpperCase()) {
        await supabase.auth.signOut()
        throw new Error(`Authorization failed: Profile is assigned to ${dbRegion.name}, not ${targetRegion.name}.`)
      }

      const activeUser = {
        id: authData.user.id,
        email: authData.user.email,
        role: 'region',
        region: dbRegion || targetRegion,
        name: dbRegion?.name || targetRegion.name
      }
      setUser(activeUser)
      await logAuditEvent(activeUser, 'region_login', {
        region_id: activeUser.region.id,
        region_name: activeUser.region.name
      })
      return activeUser
    }

    // Fallback Mock Auth
    const activeUser = {
      id: targetRegion.id,
      email: targetRegion.email,
      role: 'region',
      region: targetRegion,
      name: targetRegion.name
    }
    setUser(activeUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser))
    await logAuditEvent(activeUser, 'region_login', {
      region_id: targetRegion.id,
      region_name: targetRegion.name
    })
    return activeUser
  }

  /**
   * Central Admin Login
   */
  const loginAsAdmin = async (email, password, adminCode) => {
    // Verify admin code if provided
    if (adminCode && adminCode.trim() !== PREDEFINED_ADMIN.admin_code) {
      throw new Error('Invalid Central Admin Security Code.')
    }

    const effectiveEmail = email || PREDEFINED_ADMIN.email
    const effectivePassword = password || PREDEFINED_ADMIN.password

    if (isSupabaseConfigured) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: effectiveEmail,
        password: effectivePassword
      })

      if (authError) {
        throw new Error('Central Admin authentication failed: ' + authError.message)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (!profile || profile.role !== 'central_admin') {
        await supabase.auth.signOut()
        throw new Error('Unauthorized: Account does not have Central Admin clearance.')
      }

      const activeUser = {
        id: authData.user.id,
        email: authData.user.email,
        role: 'central_admin',
        name: 'Central Exam Authority Admin'
      }
      setUser(activeUser)
      await logAuditEvent(activeUser, 'central_admin_login', { email: activeUser.email })
      return activeUser
    }

    const activeUser = {
      id: PREDEFINED_ADMIN.id,
      email: PREDEFINED_ADMIN.email,
      role: 'central_admin',
      name: PREDEFINED_ADMIN.name
    }
    setUser(activeUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser))
    await logAuditEvent(activeUser, 'central_admin_login', { email: activeUser.email })
    return activeUser
  }

  /**
   * Exam Centre Login
   */
  const loginAsCentre = async (centreId, enteredCode, password) => {
    const targetCentre = PREDEFINED_CENTRES.find((c) => c.id === centreId)
    if (!targetCentre) {
      throw new Error('Selected Exam Centre does not exist.')
    }

    if (enteredCode.trim().toUpperCase() !== targetCentre.centre_code.toUpperCase()) {
      throw new Error(`Invalid Centre Code for ${targetCentre.name}. Access denied.`)
    }

    const effectivePassword = password || targetCentre.password

    if (isSupabaseConfigured) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetCentre.email,
        password: effectivePassword
      })

      if (authError) {
        throw new Error('Exam Centre authentication failed: ' + authError.message)
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, exam_centres(*)')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile || profile.role !== 'exam_centre') {
        await supabase.auth.signOut()
        throw new Error('Unauthorized: Account does not have Exam Centre access.')
      }

      const dbCentre = profile.exam_centres
      if (dbCentre && dbCentre.centre_code.toUpperCase() !== targetCentre.centre_code.toUpperCase()) {
        await supabase.auth.signOut()
        throw new Error(`Unauthorized: Profile is assigned to ${dbCentre.name}, not ${targetCentre.name}.`)
      }

      const activeUser = {
        id: authData.user.id,
        email: authData.user.email,
        role: 'exam_centre',
        centre: dbCentre || targetCentre,
        name: dbCentre?.name || targetCentre.name
      }
      setUser(activeUser)
      await logAuditEvent(activeUser, 'exam_centre_login', {
        centre_id: activeUser.centre.id,
        centre_name: activeUser.centre.name
      })
      return activeUser
    }

    const activeUser = {
      id: targetCentre.id,
      email: targetCentre.email,
      role: 'exam_centre',
      centre: targetCentre,
      name: targetCentre.name
    }
    setUser(activeUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser))
    await logAuditEvent(activeUser, 'exam_centre_login', {
      centre_id: targetCentre.id,
      centre_name: targetCentre.name
    })
    return activeUser
  }

  /**
   * Sign Out
   */
  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('Signout error:', err)
      }
    }
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginAsRegion,
        loginAsAdmin,
        loginAsCentre,
        logout,
        isSupabaseConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
