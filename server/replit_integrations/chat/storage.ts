import { supabase } from "../../db";

export interface IChatStorage {
  getConversation(id: number): Promise<any | undefined>;
  getAllConversations(): Promise<any[]>;
  createConversation(title: string): Promise<any>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<any[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<any>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  },

  async getAllConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  },

  async createConversation(title: string) {
    const { data } = await supabase
      .from('conversations')
      .insert({ title })
      .select()
      .single();
    return data;
  },

  async deleteConversation(id: number) {
    await supabase.from('messages').delete().eq('conversation_id', id);
    await supabase.from('conversations').delete().eq('id', id);
  },

  async getMessagesByConversation(conversationId: number) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    return data || [];
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role, content })
      .select()
      .single();
    return data;
  },
};
