export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      account_onboarding: {
        Row: {
          ledger_account_id: string;
          complete: boolean;
          risk_profile: 'Preservation' | 'Balanced' | 'Velocity';
          account_review: Json | null;
          deposit_intent_amount: number | null;
          identity_verification: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          ledger_account_id: string;
          complete?: boolean;
          risk_profile: 'Preservation' | 'Balanced' | 'Velocity';
          account_review?: Json | null;
          deposit_intent_amount?: number | null;
          identity_verification?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          ledger_account_id?: string;
          complete?: boolean;
          risk_profile?: 'Preservation' | 'Balanced' | 'Velocity';
          account_review?: Json | null;
          deposit_intent_amount?: number | null;
          identity_verification?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dashboard_invites: {
        Row: {
          id: string;
          access_request_id: string | null;
          ledger_account_id: string;
          code_hash: string;
          status: 'ACTIVE' | 'REVOKED';
          created_at: string;
          used_at: string | null;
        };
        Insert: {
          id: string;
          access_request_id?: string | null;
          ledger_account_id: string;
          code_hash: string;
          status: 'ACTIVE' | 'REVOKED';
          created_at?: string;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          access_request_id?: string | null;
          ledger_account_id?: string;
          code_hash?: string;
          status?: 'ACTIVE' | 'REVOKED';
          created_at?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      hermes_access_requests: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          role: string | null;
          organization: string | null;
          country: string;
          capital_range: string | null;
          objective: string | null;
          context: string | null;
          status: 'new' | 'review' | 'more_info' | 'approved' | 'declined';
          ai_recommendation: 'APPROVE' | 'REVIEW' | 'DECLINE';
          ai_confidence: 'LOW' | 'MEDIUM' | 'HIGH';
          ai_reasons: string[];
          ai_missing_info: string[];
          ai_risk_flags: string[];
          ai_review_source: 'openai' | 'rules';
          ai_review_model: string | null;
          ai_reviewed_at: string;
          human_decision: 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO' | null;
          human_decision_at: string | null;
          solace_user_id: string | null;
          solace_user_status: 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | null;
          hermes_account_id: string | null;
          hermes_account_status: 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | null;
          ledger_account_id: string | null;
          account_id: string | null;
          account_created_at: string | null;
          dashboard_invite_id: string | null;
          dashboard_invite_code: string | null;
          dashboard_invite_code_hash: string | null;
          dashboard_invite_status: 'ACTIVE' | 'REVOKED' | null;
          dashboard_invite_created_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          role?: string | null;
          organization?: string | null;
          country: string;
          capital_range?: string | null;
          objective?: string | null;
          context?: string | null;
          status: 'new' | 'review' | 'more_info' | 'approved' | 'declined';
          ai_recommendation: 'APPROVE' | 'REVIEW' | 'DECLINE';
          ai_confidence: 'LOW' | 'MEDIUM' | 'HIGH';
          ai_reasons?: string[];
          ai_missing_info?: string[];
          ai_risk_flags?: string[];
          ai_review_source: 'openai' | 'rules';
          ai_review_model?: string | null;
          ai_reviewed_at: string;
          human_decision?: 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO' | null;
          human_decision_at?: string | null;
          solace_user_id?: string | null;
          solace_user_status?: 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | null;
          hermes_account_id?: string | null;
          hermes_account_status?: 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | null;
          ledger_account_id?: string | null;
          account_id?: string | null;
          account_created_at?: string | null;
          dashboard_invite_id?: string | null;
          dashboard_invite_code?: string | null;
          dashboard_invite_code_hash?: string | null;
          dashboard_invite_status?: 'ACTIVE' | 'REVOKED' | null;
          dashboard_invite_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          role?: string | null;
          organization?: string | null;
          country?: string;
          capital_range?: string | null;
          objective?: string | null;
          context?: string | null;
          status?: 'new' | 'review' | 'more_info' | 'approved' | 'declined';
          ai_recommendation?: 'APPROVE' | 'REVIEW' | 'DECLINE';
          ai_confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
          ai_reasons?: string[];
          ai_missing_info?: string[];
          ai_risk_flags?: string[];
          ai_review_source?: 'openai' | 'rules';
          ai_review_model?: string | null;
          ai_reviewed_at?: string;
          human_decision?: 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO' | null;
          human_decision_at?: string | null;
          solace_user_id?: string | null;
          solace_user_status?: 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | null;
          hermes_account_id?: string | null;
          hermes_account_status?: 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | null;
          ledger_account_id?: string | null;
          account_id?: string | null;
          account_created_at?: string | null;
          dashboard_invite_id?: string | null;
          dashboard_invite_code?: string | null;
          dashboard_invite_code_hash?: string | null;
          dashboard_invite_status?: 'ACTIVE' | 'REVOKED' | null;
          dashboard_invite_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hermes_accounts: {
        Row: {
          id: string;
          solace_user_id: string;
          status: 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
          risk_profile: 'Preservation' | 'Balanced' | 'Velocity';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          solace_user_id: string;
          status: 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
          risk_profile: 'Preservation' | 'Balanced' | 'Velocity';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solace_user_id?: string;
          status?: 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
          risk_profile?: 'Preservation' | 'Balanced' | 'Velocity';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hermes_dashboard_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          snapshot?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      ledger_accounts: {
        Row: {
          id: string;
          solace_user_id: string;
          hermes_account_id: string;
          label: string;
          currency: 'USD';
          status: 'PENDING_ACTIVATION' | 'ACTIVE';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          solace_user_id: string;
          hermes_account_id: string;
          label: string;
          currency?: 'USD';
          status: 'PENDING_ACTIVATION' | 'ACTIVE';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solace_user_id?: string;
          hermes_account_id?: string;
          label?: string;
          currency?: 'USD';
          status?: 'PENDING_ACTIVATION' | 'ACTIVE';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      solace_activities: {
        Row: {
          id: string;
          ledger_account_id: string;
          type: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id: string;
          ledger_account_id: string;
          type: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ledger_account_id?: string;
          type?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      solace_deposits: {
        Row: {
          id: string;
          ledger_account_id: string;
          amount: number;
          currency: 'USD';
          status: 'pending' | 'posted' | 'failed';
          provider: 'stripe';
          provider_reference: string | null;
          payment_intent_id: string | null;
          created_at: string;
          posted_at: string | null;
        };
        Insert: {
          id: string;
          ledger_account_id: string;
          amount: number;
          currency?: 'USD';
          status: 'pending' | 'posted' | 'failed';
          provider?: 'stripe';
          provider_reference?: string | null;
          payment_intent_id?: string | null;
          created_at?: string;
          posted_at?: string | null;
        };
        Update: {
          id?: string;
          ledger_account_id?: string;
          amount?: number;
          currency?: 'USD';
          status?: 'pending' | 'posted' | 'failed';
          provider?: 'stripe';
          provider_reference?: string | null;
          payment_intent_id?: string | null;
          created_at?: string;
          posted_at?: string | null;
        };
        Relationships: [];
      };
      solace_ledger_entries: {
        Row: {
          id: string;
          ledger_account_id: string;
          type: 'deposit' | 'withdrawal' | 'pnl' | 'fee' | 'manual_adjustment';
          source: 'stripe' | 'hermes' | 'operator' | 'treasury';
          status: 'pending' | 'posted' | 'void';
          amount: number;
          currency: 'USD';
          description: string;
          external_reference: string | null;
          effective_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          ledger_account_id: string;
          type: 'deposit' | 'withdrawal' | 'pnl' | 'fee' | 'manual_adjustment';
          source: 'stripe' | 'hermes' | 'operator' | 'treasury';
          status: 'pending' | 'posted' | 'void';
          amount: number;
          currency?: 'USD';
          description: string;
          external_reference?: string | null;
          effective_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ledger_account_id?: string;
          type?: 'deposit' | 'withdrawal' | 'pnl' | 'fee' | 'manual_adjustment';
          source?: 'stripe' | 'hermes' | 'operator' | 'treasury';
          status?: 'pending' | 'posted' | 'void';
          amount?: number;
          currency?: 'USD';
          description?: string;
          external_reference?: string | null;
          effective_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      solace_users: {
        Row: {
          id: string;
          access_request_id: string | null;
          name: string;
          email: string;
          status: 'APPROVED' | 'ACTIVE' | 'SUSPENDED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          access_request_id?: string | null;
          name: string;
          email: string;
          status: 'APPROVED' | 'ACTIVE' | 'SUSPENDED';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          access_request_id?: string | null;
          name?: string;
          email?: string;
          status?: 'APPROVED' | 'ACTIVE' | 'SUSPENDED';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_deposit_sessions: {
        Row: {
          id: string;
          ledger_account_id: string;
          amount: number;
          currency: 'USD';
          status: 'open' | 'posted' | 'expired' | 'failed';
          checkout_url: string | null;
          payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id: string;
          ledger_account_id: string;
          amount: number;
          currency?: 'USD';
          status: 'open' | 'posted' | 'expired' | 'failed';
          checkout_url?: string | null;
          payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          ledger_account_id?: string;
          amount?: number;
          currency?: 'USD';
          status?: 'open' | 'posted' | 'expired' | 'failed';
          checkout_url?: string | null;
          payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      treasury_tasks: {
        Row: {
          id: string;
          ledger_account_id: string;
          deposit_id: string;
          checkout_session_id: string;
          type: 'FUND_HERMES';
          amount: number;
          currency: 'USD';
          status: 'QUEUED' | 'REVIEWING' | 'APPROVED' | 'SUBMITTED' | 'COMPLETED' | 'FAILED' | 'CANCELED';
          notes: string | null;
          external_reference: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id: string;
          ledger_account_id: string;
          deposit_id: string;
          checkout_session_id: string;
          type?: 'FUND_HERMES';
          amount: number;
          currency?: 'USD';
          status?: 'QUEUED' | 'REVIEWING' | 'APPROVED' | 'SUBMITTED' | 'COMPLETED' | 'FAILED' | 'CANCELED';
          notes?: string | null;
          external_reference?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          ledger_account_id?: string;
          deposit_id?: string;
          checkout_session_id?: string;
          type?: 'FUND_HERMES';
          amount?: number;
          currency?: 'USD';
          status?: 'QUEUED' | 'REVIEWING' | 'APPROVED' | 'SUBMITTED' | 'COMPLETED' | 'FAILED' | 'CANCELED';
          notes?: string | null;
          external_reference?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
