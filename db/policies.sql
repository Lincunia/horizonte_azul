ALTER TABLE usuarios 
ADD COLUMN auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven su propio perfil"
ON public.usuarios
FOR SELECT USING (auth.uid() = auth_id);

/*
Puede que hayan maneras mejores de hacer esto, pero con el onMounted
*/
CREATE POLICY "Sistema inserta perfiles"
ON public.usuarios
FOR INSERT WITH CHECK ( true );

CREATE POLICY "Usuarios actualizan su perfil"
ON public.usuarios
FOR UPDATE USING (auth.uid() = auth_id);
