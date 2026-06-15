export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
