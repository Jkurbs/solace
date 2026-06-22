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
      bugops_reports: {
        Row: {
          id: string;
          display_id: string;
          source: 'dashboard' | 'in_app' | 'group_chat' | 'operator' | 'logs';
          reporter_email: string | null;
          reporter_name: string | null;
          ledger_account_id: string | null;
          page_url: string | null;
          browser: string | null;
          device: string | null;
          screenshot_url: string | null;
          session_id: string | null;
          summary: string | null;
          what_happened: string;
          expected_behavior: string | null;
          actual_behavior: string | null;
          steps_to_reproduce: Json;
          can_reproduce: 'yes' | 'sometimes' | 'no' | 'unknown';
          seriousness: string | null;
          console_errors: string | null;
          severity: 'P0' | 'P1' | 'P2' | 'P3';
          trust_impact: 'trust_breaking' | 'core_product' | 'confusing' | 'cosmetic';
          area: string;
          title: string;
          user_impact: string;
          likely_cause: string;
          labels: Json;
          missing_info: Json;
          reproduction_steps: Json;
          duplicate_of_id: string | null;
          duplicate_candidates: Json;
          status:
            | 'NEW'
            | 'NEEDS_INFO'
            | 'REPRODUCED'
            | 'ASSIGNED'
            | 'FIX_PROPOSED'
            | 'IN_REVIEW'
            | 'FIXED'
            | 'RELEASED'
            | 'VERIFIED'
            | 'CLOSED';
          reporter_reply: string;
          raw_context: Json;
          created_at: string;
          updated_at: string;
          fixed_at: string | null;
          released_at: string | null;
          verified_at: string | null;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          display_id: string;
          source?: 'dashboard' | 'in_app' | 'group_chat' | 'operator' | 'logs';
          reporter_email?: string | null;
          reporter_name?: string | null;
          ledger_account_id?: string | null;
          page_url?: string | null;
          browser?: string | null;
          device?: string | null;
          screenshot_url?: string | null;
          session_id?: string | null;
          summary?: string | null;
          what_happened: string;
          expected_behavior?: string | null;
          actual_behavior?: string | null;
          steps_to_reproduce?: Json;
          can_reproduce?: 'yes' | 'sometimes' | 'no' | 'unknown';
          seriousness?: string | null;
          console_errors?: string | null;
          severity: 'P0' | 'P1' | 'P2' | 'P3';
          trust_impact: 'trust_breaking' | 'core_product' | 'confusing' | 'cosmetic';
          area: string;
          title: string;
          user_impact: string;
          likely_cause: string;
          labels?: Json;
          missing_info?: Json;
          reproduction_steps?: Json;
          duplicate_of_id?: string | null;
          duplicate_candidates?: Json;
          status:
            | 'NEW'
            | 'NEEDS_INFO'
            | 'REPRODUCED'
            | 'ASSIGNED'
            | 'FIX_PROPOSED'
            | 'IN_REVIEW'
            | 'FIXED'
            | 'RELEASED'
            | 'VERIFIED'
            | 'CLOSED';
          reporter_reply: string;
          raw_context?: Json;
          created_at?: string;
          updated_at?: string;
          fixed_at?: string | null;
          released_at?: string | null;
          verified_at?: string | null;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          display_id?: string;
          source?: 'dashboard' | 'in_app' | 'group_chat' | 'operator' | 'logs';
          reporter_email?: string | null;
          reporter_name?: string | null;
          ledger_account_id?: string | null;
          page_url?: string | null;
          browser?: string | null;
          device?: string | null;
          screenshot_url?: string | null;
          session_id?: string | null;
          summary?: string | null;
          what_happened?: string;
          expected_behavior?: string | null;
          actual_behavior?: string | null;
          steps_to_reproduce?: Json;
          can_reproduce?: 'yes' | 'sometimes' | 'no' | 'unknown';
          seriousness?: string | null;
          console_errors?: string | null;
          severity?: 'P0' | 'P1' | 'P2' | 'P3';
          trust_impact?: 'trust_breaking' | 'core_product' | 'confusing' | 'cosmetic';
          area?: string;
          title?: string;
          user_impact?: string;
          likely_cause?: string;
          labels?: Json;
          missing_info?: Json;
          reproduction_steps?: Json;
          duplicate_of_id?: string | null;
          duplicate_candidates?: Json;
          status?:
            | 'NEW'
            | 'NEEDS_INFO'
            | 'REPRODUCED'
            | 'ASSIGNED'
            | 'FIX_PROPOSED'
            | 'IN_REVIEW'
            | 'FIXED'
            | 'RELEASED'
            | 'VERIFIED'
            | 'CLOSED';
          reporter_reply?: string;
          raw_context?: Json;
          created_at?: string;
          updated_at?: string;
          fixed_at?: string | null;
          released_at?: string | null;
          verified_at?: string | null;
          closed_at?: string | null;
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
          account_mode: 'SIMULATION' | 'LIVE';
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
          account_mode?: 'SIMULATION' | 'LIVE';
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
          account_mode?: 'SIMULATION' | 'LIVE';
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
          provider: 'stripe' | 'simulation';
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
          provider?: 'stripe' | 'simulation';
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
          provider?: 'stripe' | 'simulation';
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
          source: 'stripe' | 'simulation' | 'hermes' | 'operator' | 'treasury';
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
          source: 'stripe' | 'simulation' | 'hermes' | 'operator' | 'treasury';
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
          source?: 'stripe' | 'simulation' | 'hermes' | 'operator' | 'treasury';
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
      stripe_deposit_settlements: {
        Row: {
          id: string;
          ledger_account_id: string;
          deposit_id: string;
          checkout_session_id: string;
          payment_intent_id: string | null;
          charge_id: string | null;
          balance_transaction_id: string | null;
          gross_amount: number;
          stripe_fee_amount: number;
          net_amount: number;
          currency: 'USD';
          status: 'pending' | 'available' | 'unavailable';
          balance_type: string | null;
          reporting_category: string | null;
          exchange_rate: number | null;
          stripe_created_at: string | null;
          available_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          ledger_account_id: string;
          deposit_id: string;
          checkout_session_id: string;
          payment_intent_id?: string | null;
          charge_id?: string | null;
          balance_transaction_id?: string | null;
          gross_amount: number;
          stripe_fee_amount?: number;
          net_amount: number;
          currency?: 'USD';
          status?: 'pending' | 'available' | 'unavailable';
          balance_type?: string | null;
          reporting_category?: string | null;
          exchange_rate?: number | null;
          stripe_created_at?: string | null;
          available_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ledger_account_id?: string;
          deposit_id?: string;
          checkout_session_id?: string;
          payment_intent_id?: string | null;
          charge_id?: string | null;
          balance_transaction_id?: string | null;
          gross_amount?: number;
          stripe_fee_amount?: number;
          net_amount?: number;
          currency?: 'USD';
          status?: 'pending' | 'available' | 'unavailable';
          balance_type?: string | null;
          reporting_category?: string | null;
          exchange_rate?: number | null;
          stripe_created_at?: string | null;
          available_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      strategy_pools: {
        Row: {
          id: string;
          name: string;
          risk_profile: 'Preservation' | 'Balanced' | 'Velocity';
          status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
          currency: 'USD';
          accounting_version: 'pool_units_v1';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          risk_profile: 'Preservation' | 'Balanced' | 'Velocity';
          status?: 'ACTIVE' | 'PAUSED' | 'CLOSED';
          currency?: 'USD';
          accounting_version?: 'pool_units_v1';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          risk_profile?: 'Preservation' | 'Balanced' | 'Velocity';
          status?: 'ACTIVE' | 'PAUSED' | 'CLOSED';
          currency?: 'USD';
          accounting_version?: 'pool_units_v1';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pool_nav_snapshots: {
        Row: {
          id: string;
          pool_id: string;
          gross_equity: number;
          cash_balance: number;
          allocated_capital: number;
          reserved_margin: number;
          realized_pnl: number;
          unrealized_pnl: number;
          fees: number;
          funding: number;
          total_units: number;
          nav_per_unit: number;
          accounting_version: 'pool_units_v1';
          source: 'operator' | 'exchange_mark' | 'migration';
          effective_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          pool_id: string;
          gross_equity?: number;
          cash_balance?: number;
          allocated_capital?: number;
          reserved_margin?: number;
          realized_pnl?: number;
          unrealized_pnl?: number;
          fees?: number;
          funding?: number;
          total_units?: number;
          nav_per_unit?: number;
          accounting_version?: 'pool_units_v1';
          source?: 'operator' | 'exchange_mark' | 'migration';
          effective_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          gross_equity?: number;
          cash_balance?: number;
          allocated_capital?: number;
          reserved_margin?: number;
          realized_pnl?: number;
          unrealized_pnl?: number;
          fees?: number;
          funding?: number;
          total_units?: number;
          nav_per_unit?: number;
          accounting_version?: 'pool_units_v1';
          source?: 'operator' | 'exchange_mark' | 'migration';
          effective_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pool_allocation_snapshots: {
        Row: {
          id: string;
          pool_id: string;
          allocation_basis: 'capital' | 'exposure';
          allocations: Json;
          total_exposure: number;
          total_margin: number;
          cash_balance: number;
          source: 'hermes_bridge' | 'operator';
          effective_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          pool_id: string;
          allocation_basis?: 'capital' | 'exposure';
          allocations?: Json;
          total_exposure?: number;
          total_margin?: number;
          cash_balance?: number;
          source?: 'hermes_bridge' | 'operator';
          effective_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          allocation_basis?: 'capital' | 'exposure';
          allocations?: Json;
          total_exposure?: number;
          total_margin?: number;
          cash_balance?: number;
          source?: 'hermes_bridge' | 'operator';
          effective_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      hermes_pool_source_marks: {
        Row: {
          id: string;
          pool_id: string;
          status: 'baseline' | 'applied' | 'stored';
          source: 'hermes_bridge' | 'operator';
          source_exchange: string | null;
          source_equity: number;
          source_cash_balance: number;
          source_allocated_capital: number;
          source_reserved_margin: number;
          source_realized_pnl: number;
          source_unrealized_pnl: number;
          source_fees: number;
          source_funding: number;
          source_return: number;
          applied_pool_equity: number | null;
          applied_pool_nav_per_unit: number | null;
          nav_snapshot_id: string | null;
          raw_payload: Json;
          effective_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          pool_id: string;
          status?: 'baseline' | 'applied' | 'stored';
          source?: 'hermes_bridge' | 'operator';
          source_exchange?: string | null;
          source_equity: number;
          source_cash_balance?: number;
          source_allocated_capital?: number;
          source_reserved_margin?: number;
          source_realized_pnl?: number;
          source_unrealized_pnl?: number;
          source_fees?: number;
          source_funding?: number;
          source_return?: number;
          applied_pool_equity?: number | null;
          applied_pool_nav_per_unit?: number | null;
          nav_snapshot_id?: string | null;
          raw_payload?: Json;
          effective_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          status?: 'baseline' | 'applied' | 'stored';
          source?: 'hermes_bridge' | 'operator';
          source_exchange?: string | null;
          source_equity?: number;
          source_cash_balance?: number;
          source_allocated_capital?: number;
          source_reserved_margin?: number;
          source_realized_pnl?: number;
          source_unrealized_pnl?: number;
          source_fees?: number;
          source_funding?: number;
          source_return?: number;
          applied_pool_equity?: number | null;
          applied_pool_nav_per_unit?: number | null;
          nav_snapshot_id?: string | null;
          raw_payload?: Json;
          effective_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      hermes_source_capital_flows: {
        Row: {
          id: string;
          pool_id: string;
          direction: 'SOURCE_DEPOSIT' | 'SOURCE_WITHDRAWAL';
          amount: number;
          currency: 'USD';
          source_exchange: string | null;
          notes: string | null;
          effective_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          pool_id: string;
          direction: 'SOURCE_DEPOSIT' | 'SOURCE_WITHDRAWAL';
          amount: number;
          currency?: 'USD';
          source_exchange?: string | null;
          notes?: string | null;
          effective_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          direction?: 'SOURCE_DEPOSIT' | 'SOURCE_WITHDRAWAL';
          amount?: number;
          currency?: 'USD';
          source_exchange?: string | null;
          notes?: string | null;
          effective_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      hermes_realized_trade_events: {
        Row: {
          id: string;
          pool_id: string;
          source_exchange: string;
          source_trade_id: string;
          source_position_id: string | null;
          symbol: string;
          side: 'LONG' | 'SHORT';
          quantity: number;
          entry_price: number | null;
          exit_price: number | null;
          realized_pnl: number;
          fees: number;
          funding: number;
          net_pnl: number;
          opened_at: string | null;
          closed_at: string;
          raw_payload: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          pool_id: string;
          source_exchange?: string;
          source_trade_id: string;
          source_position_id?: string | null;
          symbol: string;
          side: 'LONG' | 'SHORT';
          quantity?: number;
          entry_price?: number | null;
          exit_price?: number | null;
          realized_pnl?: number;
          fees?: number;
          funding?: number;
          net_pnl?: number;
          opened_at?: string | null;
          closed_at: string;
          raw_payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          source_exchange?: string;
          source_trade_id?: string;
          source_position_id?: string | null;
          symbol?: string;
          side?: 'LONG' | 'SHORT';
          quantity?: number;
          entry_price?: number | null;
          exit_price?: number | null;
          realized_pnl?: number;
          fees?: number;
          funding?: number;
          net_pnl?: number;
          opened_at?: string | null;
          closed_at?: string;
          raw_payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      pool_unit_events: {
        Row: {
          id: string;
          pool_id: string;
          ledger_account_id: string;
          type: 'deposit_mint' | 'withdrawal_burn' | 'fee_accrual' | 'manual_adjustment';
          source: 'stripe_deposit' | 'withdrawal' | 'operator' | 'nav_migration';
          units_delta: number;
          amount: number;
          currency: 'USD';
          nav_per_unit: number;
          accounting_version: 'pool_units_v1';
          effective_at: string;
          source_reference: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          pool_id: string;
          ledger_account_id: string;
          type: 'deposit_mint' | 'withdrawal_burn' | 'fee_accrual' | 'manual_adjustment';
          source: 'stripe_deposit' | 'withdrawal' | 'operator' | 'nav_migration';
          units_delta: number;
          amount?: number;
          currency?: 'USD';
          nav_per_unit: number;
          accounting_version?: 'pool_units_v1';
          effective_at: string;
          source_reference?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          ledger_account_id?: string;
          type?: 'deposit_mint' | 'withdrawal_burn' | 'fee_accrual' | 'manual_adjustment';
          source?: 'stripe_deposit' | 'withdrawal' | 'operator' | 'nav_migration';
          units_delta?: number;
          amount?: number;
          currency?: 'USD';
          nav_per_unit?: number;
          accounting_version?: 'pool_units_v1';
          effective_at?: string;
          source_reference?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      user_pool_positions: {
        Row: {
          pool_id: string;
          ledger_account_id: string;
          units: number;
          available_units: number;
          nav_per_unit: number;
          equity: number;
          pool_share: number;
          accounting_version: 'pool_units_v1';
          updated_at: string;
        };
        Insert: {
          pool_id: string;
          ledger_account_id: string;
          units?: number;
          available_units?: number;
          nav_per_unit?: number;
          equity?: number;
          pool_share?: number;
          accounting_version?: 'pool_units_v1';
          updated_at?: string;
        };
        Update: {
          pool_id?: string;
          ledger_account_id?: string;
          units?: number;
          available_units?: number;
          nav_per_unit?: number;
          equity?: number;
          pool_share?: number;
          accounting_version?: 'pool_units_v1';
          updated_at?: string;
        };
        Relationships: [];
      };
      pool_deposit_allocations: {
        Row: {
          id: string;
          deposit_id: string;
          pool_id: string;
          ledger_account_id: string;
          amount: number;
          currency: 'USD';
          nav_per_unit: number;
          units_minted: number;
          status: 'pending' | 'posted' | 'void';
          pool_unit_event_id: string | null;
          accounting_version: 'pool_units_v1';
          effective_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          deposit_id: string;
          pool_id: string;
          ledger_account_id: string;
          amount: number;
          currency?: 'USD';
          nav_per_unit: number;
          units_minted: number;
          status?: 'pending' | 'posted' | 'void';
          pool_unit_event_id?: string | null;
          accounting_version?: 'pool_units_v1';
          effective_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deposit_id?: string;
          pool_id?: string;
          ledger_account_id?: string;
          amount?: number;
          currency?: 'USD';
          nav_per_unit?: number;
          units_minted?: number;
          status?: 'pending' | 'posted' | 'void';
          pool_unit_event_id?: string | null;
          accounting_version?: 'pool_units_v1';
          effective_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pool_withdrawal_redemptions: {
        Row: {
          id: string;
          withdrawal_reference: string;
          pool_id: string;
          ledger_account_id: string;
          amount: number;
          currency: 'USD';
          nav_per_unit: number;
          units_burned: number;
          status: 'pending' | 'posted' | 'void';
          pool_unit_event_id: string | null;
          accounting_version: 'pool_units_v1';
          effective_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          withdrawal_reference: string;
          pool_id: string;
          ledger_account_id: string;
          amount: number;
          currency?: 'USD';
          nav_per_unit: number;
          units_burned: number;
          status?: 'pending' | 'posted' | 'void';
          pool_unit_event_id?: string | null;
          accounting_version?: 'pool_units_v1';
          effective_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          withdrawal_reference?: string;
          pool_id?: string;
          ledger_account_id?: string;
          amount?: number;
          currency?: 'USD';
          nav_per_unit?: number;
          units_burned?: number;
          status?: 'pending' | 'posted' | 'void';
          pool_unit_event_id?: string | null;
          accounting_version?: 'pool_units_v1';
          effective_at?: string;
          created_at?: string;
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
          status:
            | 'WAITING_SETTLEMENT'
            | 'QUEUED'
            | 'REVIEWING'
            | 'FUNDABLE'
            | 'APPROVED'
            | 'SUBMITTED'
            | 'COMPLETED'
            | 'FAILED'
            | 'CANCELED';
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
          status?:
            | 'WAITING_SETTLEMENT'
            | 'QUEUED'
            | 'REVIEWING'
            | 'FUNDABLE'
            | 'APPROVED'
            | 'SUBMITTED'
            | 'COMPLETED'
            | 'FAILED'
            | 'CANCELED';
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
          status?:
            | 'WAITING_SETTLEMENT'
            | 'QUEUED'
            | 'REVIEWING'
            | 'FUNDABLE'
            | 'APPROVED'
            | 'SUBMITTED'
            | 'COMPLETED'
            | 'FAILED'
            | 'CANCELED';
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
    Functions: {
      post_pool_deposit_allocation: {
        Args: {
          p_amount: number;
          p_currency?: 'USD';
          p_deposit_id: string;
          p_effective_at?: string;
          p_ledger_account_id: string;
          p_source_reference?: string | null;
        };
        Returns: Array<{
          pool_id: string;
          pool_unit_event_id: string;
          units_minted: number;
          nav_per_unit: number;
          total_units: number;
        }>;
      };
      post_pool_nav_mark: {
        Args: {
          p_allocated_capital: number;
          p_cash_balance: number;
          p_effective_at?: string;
          p_fees: number;
          p_funding: number;
          p_gross_equity: number;
          p_pool_id: string;
          p_realized_pnl: number;
          p_reserved_margin: number;
          p_unrealized_pnl: number;
        };
        Returns: Array<{
          pool_id: string;
          nav_snapshot_id: string;
          nav_per_unit: number;
          total_units: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
