import { applyPrivacy, applyPrivacyList } from '../config/privacy.js';
export function registerCaseTools(server, supabase) {
    // ── list_cases ──────────────────────────────────────────────────────────────
    server.tool('list_cases', 'List active shipment cases. Optionally filter by status or priority. Returns sanitized case data.', {
        type: 'object',
        properties: {
            status: { type: 'string', description: 'Filter by case status (e.g. "vendor_requested", "in_transit")' },
            priority: { type: 'string', description: 'Filter by priority: low, normal, high, urgent' },
            limit: { type: 'number', description: 'Max results (default 20)' },
        },
    }, async (args) => {
        let query = supabase
            .from('shipment_cases')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(args.limit || 20);
        if (args.status)
            query = query.eq('status', args.status);
        if (args.priority)
            query = query.eq('priority', args.priority);
        const { data, error } = await query;
        if (error)
            throw new Error(error.message);
        return {
            cases: applyPrivacyList('shipment_cases', (data || [])),
            count: data?.length ?? 0,
            _privacy: 'client_email and client_name redacted per privacy policy',
        };
    });
    // ── get_case ────────────────────────────────────────────────────────────────
    server.tool('get_case', 'Get full detail for a single shipment case by its case ID or ref_number.', {
        type: 'object',
        required: ['id_or_ref'],
        properties: {
            id_or_ref: { type: 'string', description: 'The case UUID or ref_number (e.g. "354830")' },
        },
    }, async (args) => {
        const val = args.id_or_ref;
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const { data: byRef } = await supabase.from('shipment_cases').select('*').eq('ref_number', val).maybeSingle();
        const { data: byId } = (!byRef && UUID_RE.test(val))
            ? await supabase.from('shipment_cases').select('*').eq('id', val).maybeSingle()
            : { data: null };
        const caseData = byRef || byId;
        if (!caseData)
            throw new Error(`Case not found: ${val}`);
        return {
            case: applyPrivacy('shipment_cases', caseData),
            _privacy: 'client_email and client_name redacted per privacy policy',
        };
    });
    // ── get_case_channels ───────────────────────────────────────────────────────
    server.tool('get_case_channels', 'Get communication channels (client and vendor) for a case.', {
        type: 'object',
        required: ['case_id'],
        properties: {
            case_id: { type: 'string', description: 'The case UUID' },
        },
    }, async (args) => {
        const { data, error } = await supabase
            .from('case_channels')
            .select('id, case_id, channel_type, nylas_thread_id, cc_emails, last_message_at, message_count, created_at')
            .eq('case_id', args.case_id);
        if (error)
            throw new Error(error.message);
        // party_email is PII — omitted
        return { channels: data || [] };
    });
}
