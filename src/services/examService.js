import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { PREDEFINED_REGIONS } from '../data/predefinedData'
import {
  getMockSubmissions,
  saveMockSubmissions,
  getMockMasterPaper,
  saveMockMasterPaper,
  getMockAuditLogs,
  addMockAuditLog
} from './mockStorage'

/**
 * Log an audit event
 */
export const logAuditEvent = async (user, eventType, details = {}) => {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('audit_logs').insert([
        {
          user_id: user?.id || null,
          user_email: user?.email || user?.name || 'anonymous',
          role: user?.role || 'unknown',
          event_type: eventType,
          details
        }
      ])
    } catch (err) {
      console.warn('Audit log write error:', err)
    }
  } else {
    addMockAuditLog(user, eventType, details)
  }
}

/**
 * Fetch all audit logs (for Central Admin)
 */
export const getAuditLogs = async () => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      return []
    }
    return data || []
  }

  return getMockAuditLogs()
}

/**
 * Fetch current region's single submission
 */
export const getRegionSubmission = async (regionId) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('question_paper_submissions')
      .select('*')
      .eq('region_id', regionId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching submission:', error)
      return null
    }
    return data
  }

  const submissions = getMockSubmissions()
  return submissions[regionId] || null
}

/**
 * Upload or Replace Draft Question Paper for a Region
 */
export const uploadRegionPaper = async (region, user, file) => {
  if (!file) throw new Error('No file provided')
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files (.pdf) are permitted')
  }

  // Check if existing submission is already locked
  const existing = await getRegionSubmission(region.id)
  if (existing && existing.status === 'submitted') {
    throw new Error('Submission is permanently locked. Modifications are strictly forbidden.')
  }

  if (isSupabaseConfigured) {
    const filePath = `region_${region.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    
    // Upload to private bucket
    const { error: uploadError } = await supabase.storage
      .from('question-papers')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      throw new Error('Storage upload failed: ' + uploadError.message)
    }

    let result
    if (existing) {
      // Update existing draft
      const { data, error } = await supabase
        .from('question_paper_submissions')
        .update({
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          status: 'draft',
          uploaded_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new draft
      const { data, error } = await supabase
        .from('question_paper_submissions')
        .insert([
          {
            region_id: region.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            status: 'draft',
            uploaded_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error
      result = data
    }

    await logAuditEvent(user, 'question_paper_uploaded', {
      region_name: region.name,
      file_name: file.name,
      action: existing ? 'replaced' : 'uploaded',
      status: 'draft'
    })

    return result
  }

  // Fallback / Mock Mode
  const submissions = getMockSubmissions()
  const filePath = `mock/region_${region.id}/${Date.now()}_${file.name}`
  const submissionRecord = {
    id: existing?.id || 'sub-' + region.id,
    region_id: region.id,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    status: 'draft',
    uploaded_at: new Date().toISOString(),
    confirmed_at: null
  }

  submissions[region.id] = submissionRecord
  saveMockSubmissions(submissions)

  addMockAuditLog(user, 'question_paper_uploaded', {
    region_name: region.name,
    file_name: file.name,
    action: existing ? 'replaced' : 'uploaded',
    status: 'draft'
  })

  return submissionRecord
}

/**
 * Remove Draft Question Paper (Allowed ONLY in draft state)
 */
export const removeRegionDraft = async (region, user) => {
  const existing = await getRegionSubmission(region.id)
  if (!existing) return

  if (existing.status === 'submitted') {
    throw new Error('Submission is permanently locked. Cannot remove confirmed paper.')
  }

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('question_paper_submissions')
      .delete()
      .eq('id', existing.id)

    if (error) throw error

    await logAuditEvent(user, 'question_paper_draft_removed', {
      region_name: region.name,
      file_name: existing.file_name
    })
  } else {
    const submissions = getMockSubmissions()
    delete submissions[region.id]
    saveMockSubmissions(submissions)

    addMockAuditLog(user, 'question_paper_draft_removed', {
      region_name: region.name,
      file_name: existing.file_name
    })
  }
}

/**
 * Confirm and Permanently Lock Regional Question Paper
 */
export const confirmRegionSubmission = async (region, user) => {
  const existing = await getRegionSubmission(region.id)
  if (!existing) {
    throw new Error('No draft question paper found to confirm.')
  }
  if (existing.status === 'submitted') {
    throw new Error('Submission is already confirmed and locked.')
  }

  const confirmedAt = new Date().toISOString()

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('question_paper_submissions')
      .update({
        status: 'submitted',
        confirmed_at: confirmedAt
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error

    await logAuditEvent(user, 'submission_confirmed', {
      region_name: region.name,
      file_name: existing.file_name,
      confirmed_at: confirmedAt,
      status: 'submitted_locked'
    })

    return data
  }

  const submissions = getMockSubmissions()
  const updatedRecord = {
    ...existing,
    status: 'submitted',
    confirmed_at: confirmedAt
  }

  submissions[region.id] = updatedRecord
  saveMockSubmissions(submissions)

  addMockAuditLog(user, 'submission_confirmed', {
    region_name: region.name,
    file_name: existing.file_name,
    confirmed_at: confirmedAt,
    status: 'submitted_locked'
  })

  return updatedRecord
}

/**
 * Fetch all 5 regions and their submission statuses (for Central Admin)
 */
export const getAllRegionSubmissions = async () => {
  if (isSupabaseConfigured) {
    // 1. Fetch regions
    const { data: regionsData } = await supabase
      .from('regions')
      .select('*')
      .order('name', { ascending: true })

    const regionsList = regionsData && regionsData.length > 0 ? regionsData : PREDEFINED_REGIONS

    // 2. Fetch submissions
    const { data: submissionsData } = await supabase
      .from('question_paper_submissions')
      .select('*')

    const subMap = {}
    if (submissionsData) {
      submissionsData.forEach((s) => {
        subMap[s.region_id] = s
      })
    }

    return regionsList.map((region) => {
      const sub = subMap[region.id]
      return {
        region_id: region.id,
        region_name: region.name,
        region_code: region.region_code,
        status: sub ? sub.status : 'pending',
        file_name: sub ? sub.file_name : null,
        file_size: sub ? sub.file_size : 0,
        uploaded_at: sub ? sub.uploaded_at : null,
        confirmed_at: sub ? sub.confirmed_at : null
      }
    })
  }

  const submissions = getMockSubmissions()
  return PREDEFINED_REGIONS.map((region) => {
    const sub = submissions[region.id]
    return {
      region_id: region.id,
      region_name: region.name,
      region_code: region.region_code,
      status: sub ? sub.status : 'pending',
      file_name: sub ? sub.file_name : null,
      file_size: sub ? sub.file_size : 0,
      uploaded_at: sub ? sub.uploaded_at : null,
      confirmed_at: sub ? sub.confirmed_at : null
    }
  })
}

/**
 * Fetch Master Paper Status
 */
export const getMasterPaper = async () => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('master_paper')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching master paper:', error)
      return null
    }
    return data
  }

  return getMockMasterPaper()
}

/**
 * Upload Master Question Paper (Central Admin only)
 */
export const uploadMasterPaper = async (user, file) => {
  if (!file) throw new Error('No master paper file provided')
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Master paper must be a PDF document (.pdf)')
  }

  const uploadedAt = new Date().toISOString()
  const filePath = `master/${Date.now()}_${file.name.replace(/\s+/g, '_')}`

  if (isSupabaseConfigured) {
    const { error: uploadError } = await supabase.storage
      .from('master-papers')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      throw new Error('Master paper upload failed: ' + uploadError.message)
    }

    // Insert or update master paper record
    const existing = await getMasterPaper()
    let record
    if (existing) {
      const { data, error } = await supabase
        .from('master_paper')
        .update({
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          status: 'draft',
          uploaded_at: uploadedAt,
          published_at: null
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      record = data
    } else {
      const { data, error } = await supabase
        .from('master_paper')
        .insert([
          {
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            status: 'draft',
            uploaded_at: uploadedAt
          }
        ])
        .select()
        .single()
      if (error) throw error
      record = data
    }

    await logAuditEvent(user, 'master_paper_uploaded', {
      file_name: file.name,
      file_size: file.size,
      status: 'draft'
    })

    return record
  }

  const record = {
    id: 'master-paper-001',
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    status: 'draft',
    uploaded_at: uploadedAt,
    published_at: null
  }
  saveMockMasterPaper(record)

  addMockAuditLog(user, 'master_paper_uploaded', {
    file_name: file.name,
    file_size: file.size,
    status: 'draft'
  })

  return record
}

/**
 * Publish Master Question Paper (Double Confirmation Done by caller)
 */
export const publishMasterPaper = async (paperId, user) => {
  const publishedAt = new Date().toISOString()

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('master_paper')
      .update({
        status: 'published',
        published_at: publishedAt
      })
      .eq('id', paperId)
      .select()
      .single()

    if (error) throw error

    await logAuditEvent(user, 'master_paper_published', {
      paper_id: paperId,
      published_at: publishedAt,
      status: 'published'
    })

    return data
  }

  const current = getMockMasterPaper()
  if (!current) throw new Error('No master paper found to publish')

  const updated = {
    ...current,
    status: 'published',
    published_at: publishedAt
  }
  saveMockMasterPaper(updated)

  addMockAuditLog(user, 'master_paper_published', {
    paper_id: current.id,
    published_at: publishedAt,
    status: 'published'
  })

  return updated
}

/**
 * Securely Download Master Question Paper (Authenticated Exam Centre)
 */
export const downloadMasterPaper = async (user, masterPaper) => {
  if (!masterPaper || masterPaper.status !== 'published') {
    throw new Error('Master question paper is not published yet.')
  }

  await logAuditEvent(user, 'master_paper_downloaded', {
    paper_id: masterPaper.id,
    file_name: masterPaper.file_name,
    centre_name: user.name || user.centre_name || 'Exam Centre',
    downloaded_at: new Date().toISOString()
  })

  if (isSupabaseConfigured) {
    // Generate private signed URL valid for 60 seconds
    const { data, error } = await supabase.storage
      .from('master-papers')
      .createSignedUrl(masterPaper.file_path, 60)

    if (error) throw error

    // Trigger download
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = masterPaper.file_name
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return data.signedUrl
  }

  // In Mock Mode: generate a valid PDF blob dynamically
  const samplePdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 18 Tf
50 720 Td
(SECURE MASTER QUESTION PAPER) Tj
/F1 12 Tf
0 -40 Td
(Published by Central Exam Authority) Tj
0 -25 Td
(File: ${masterPaper.file_name}) Tj
0 -25 Td
(Downloaded by: ${user.name || 'Exam Centre'}) Tj
0 -25 Td
(Controlled Distribution Verified) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000497 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
570
%%EOF`

  const blob = new Blob([samplePdfContent], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = masterPaper.file_name || 'Master_Question_Paper.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return url
}
