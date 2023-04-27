-- Create the netx_dams user
CREATE ROLE netx_dams NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'netx_dams';
GRANT REFERENCES, SELECT ON TABLE public.constituent_records TO netx_dams;
GRANT REFERENCES, SELECT ON TABLE public.main_object_information TO netx_dams;
GRANT REFERENCES, SELECT ON TABLE public.media_information TO netx_dams;
GRANT REFERENCES, SELECT ON TABLE public.object_constituent_mappings TO netx_dams;
