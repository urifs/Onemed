-- AccountMenu.tsx faz upsert(user_id, email, name) ao salvar o nome na área de
-- membros, mas a única policy de INSERT em profiles exigia has_role('admin') —
-- um membro comum que nunca teve linha em profiles não conseguia criar a
-- própria (o UPDATE de "Users can update their own profile" só vale pra linha
-- já existente). Adiciona INSERT self-service, restrito à própria linha.
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);
