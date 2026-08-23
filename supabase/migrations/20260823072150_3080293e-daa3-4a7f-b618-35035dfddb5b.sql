
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CITIES
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  cost_index integer NOT NULL DEFAULT 50,
  popularity integer NOT NULL DEFAULT 50,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities public read" ON public.cities FOR SELECT TO anon, authenticated USING (true);

-- ACTIVITIES
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  cost numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 60,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activities TO anon, authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities public read" ON public.activities FOR SELECT TO anon, authenticated USING (true);

-- TRIPS
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  cover_image_url text,
  budget numeric(12,2),
  is_public boolean NOT NULL DEFAULT false,
  share_slug text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8),'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT SELECT ON public.trips TO anon;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trips" ON public.trips FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public trips readable" ON public.trips FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "admins read trips" ON public.trips FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trips_touch BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- STOPS
CREATE TABLE public.trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id),
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  position integer NOT NULL DEFAULT 0,
  notes text,
  transport_cost numeric(10,2) NOT NULL DEFAULT 0,
  accommodation_cost numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_stops TO authenticated;
GRANT SELECT ON public.trip_stops TO anon;
GRANT ALL ON public.trip_stops TO service_role;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stops" ON public.trip_stops FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));
CREATE POLICY "public stops readable" ON public.trip_stops FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.is_public));

-- TRIP ACTIVITIES
CREATE TABLE public.trip_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id uuid NOT NULL REFERENCES public.trip_stops(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'sightseeing',
  scheduled_date date NOT NULL,
  start_time time,
  cost numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 60,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_activities TO authenticated;
GRANT SELECT ON public.trip_activities TO anon;
GRANT ALL ON public.trip_activities TO service_role;
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trip activities" ON public.trip_activities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_stops s JOIN public.trips t ON t.id = s.trip_id WHERE s.id = stop_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_stops s JOIN public.trips t ON t.id = s.trip_id WHERE s.id = stop_id AND t.user_id = auth.uid()));
CREATE POLICY "public trip activities readable" ON public.trip_activities FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_stops s JOIN public.trips t ON t.id = s.trip_id WHERE s.id = stop_id AND t.is_public));

-- EXPENSES
CREATE TABLE public.trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_expenses TO authenticated;
GRANT SELECT ON public.trip_expenses TO anon;
GRANT ALL ON public.trip_expenses TO service_role;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own expenses" ON public.trip_expenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));
CREATE POLICY "public expenses readable" ON public.trip_expenses FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.is_public));

CREATE INDEX idx_stops_trip ON public.trip_stops(trip_id);
CREATE INDEX idx_tact_stop ON public.trip_activities(stop_id);
CREATE INDEX idx_act_city ON public.activities(city_id);

-- SEED CITIES
INSERT INTO public.cities (name, country, region, cost_index, popularity, description) VALUES
('Paris','France','Europe',82,98,'Boulevards, museums and pastry counters.'),
('Lyon','France','Europe',68,71,'France''s gastronomic capital on two rivers.'),
('Barcelona','Spain','Europe',70,94,'Modernist architecture and Mediterranean beaches.'),
('Lisbon','Portugal','Europe',58,90,'Tiled hills, trams and Atlantic light.'),
('Rome','Italy','Europe',74,96,'Layered ruins and long dinners.'),
('Florence','Italy','Europe',72,85,'Renaissance galleries and Tuscan hills.'),
('Amsterdam','Netherlands','Europe',80,88,'Canal rings and cycling culture.'),
('Copenhagen','Denmark','Europe',88,80,'Design, harbours and new Nordic food.'),
('Stockholm','Sweden','Europe',85,76,'An archipelago capital of 14 islands.'),
('Reykjavik','Iceland','Europe',95,70,'Basecamp for volcanoes and aurora.'),
('Tokyo','Japan','Asia',78,99,'Endless neighbourhoods, endless appetite.'),
('Kyoto','Japan','Asia',72,93,'Temples, moss gardens and machiya lanes.'),
('Osaka','Japan','Asia',70,84,'Street food and neon canals.'),
('Seoul','South Korea','Asia',66,87,'Palaces, mountains and late-night markets.'),
('Bangkok','Thailand','Asia',42,92,'Riverside temples and hawker heat.'),
('Bali','Indonesia','Asia',38,89,'Rice terraces, reefs and surf towns.'),
('Marrakech','Morocco','Africa',40,78,'Souks, riads and the Atlas horizon.'),
('Cape Town','South Africa','Africa',48,82,'Table Mountain between two oceans.'),
('New York','United States','Americas',96,97,'The density record-holder.'),
('Mexico City','Mexico','Americas',45,88,'Murals, mezcal and volcanic altitude.'),
('Buenos Aires','Argentina','Americas',40,79,'Grand avenues and late steak dinners.'),
('Queenstown','New Zealand','Oceania',75,74,'Adventure sports beside Lake Wakatipu.');

-- SEED ACTIVITIES
INSERT INTO public.activities (city_id, name, category, cost, duration_minutes, description)
SELECT c.id, v.name, v.category, v.cost, v.dur, v.descr
FROM public.cities c
JOIN (VALUES
 ('Paris','Louvre Guided Tour','culture',85,180,'Skip-the-line highlights walk.'),
 ('Paris','Marais Food Crawl','food',65,150,'Six tastings across the old quarter.'),
 ('Paris','Seine Evening Cruise','sightseeing',35,75,'Illuminated bridges at dusk.'),
 ('Lyon','Bouchon Dinner','food',55,120,'Classic Lyonnais tasting menu.'),
 ('Lyon','Traboules Walking Tour','culture',20,90,'Hidden Renaissance passageways.'),
 ('Barcelona','Sagrada Familia Entry','culture',40,90,'Gaudi''s unfinished basilica.'),
 ('Barcelona','Tapas & Vermouth Tour','food',60,180,'Gracia neighbourhood crawl.'),
 ('Barcelona','Montjuic Cable Car','sightseeing',15,45,'Harbour panorama ride.'),
 ('Lisbon','Tram 28 & Alfama Walk','sightseeing',12,120,'Old town on rails and foot.'),
 ('Lisbon','Sintra Day Trip','nature',70,480,'Palaces in the misty hills.'),
 ('Rome','Colosseum Underground','culture',95,150,'Arena floor and hypogeum access.'),
 ('Rome','Trastevere Food Tour','food',75,180,'Roman classics after dark.'),
 ('Florence','Uffizi Gallery','culture',45,150,'Botticelli to Caravaggio.'),
 ('Amsterdam','Van Gogh Museum','culture',30,120,'The largest collection anywhere.'),
 ('Amsterdam','Canal Bike Loop','nature',25,180,'Guided ride through the rings.'),
 ('Copenhagen','Harbour Sauna & Swim','wellness',40,90,'Cold plunge, Nordic style.'),
 ('Copenhagen','Torvehallerne Market','food',30,90,'Grazing the glass market halls.'),
 ('Stockholm','Archipelago Ferry','nature',35,240,'Island hopping by boat.'),
 ('Stockholm','Vasa Museum','culture',25,90,'A salvaged 17th-century warship.'),
 ('Reykjavik','Golden Circle Tour','nature',110,480,'Geysers, falls and rift valley.'),
 ('Reykjavik','Northern Lights Chase','nature',90,240,'Night hunt outside the city.'),
 ('Tokyo','Tsukiji Breakfast Walk','food',50,120,'Outer market tastings.'),
 ('Tokyo','TeamLab Digital Art','culture',35,150,'Immersive light installations.'),
 ('Tokyo','Shibuya Night Photography','sightseeing',45,120,'Neon crossings by camera.'),
 ('Kyoto','Fushimi Inari Sunrise','nature',0,150,'Ten thousand torii gates.'),
 ('Kyoto','Tea Ceremony in Gion','culture',60,90,'Matcha with a tea master.'),
 ('Kyoto','Arashiyama Bamboo Ride','nature',25,120,'Rickshaw through the grove.'),
 ('Osaka','Dotonbori Street Food','food',35,120,'Takoyaki to kushikatsu.'),
 ('Osaka','Osaka Castle & Park','culture',15,120,'Moats, keep and plum trees.'),
 ('Seoul','Bukchon Hanok Walk','culture',10,120,'Traditional houses on the ridge.'),
 ('Seoul','Korean BBQ Night','food',45,120,'Grill-your-own in Mapo.'),
 ('Bangkok','Grand Palace & Wat Pho','culture',20,180,'Gilded halls and reclining Buddha.'),
 ('Bangkok','Longtail Canal Tour','sightseeing',25,120,'Thonburi waterways.'),
 ('Bali','Ubud Rice Terrace Trek','nature',18,180,'Tegallalang morning walk.'),
 ('Bali','Surf Lesson at Canggu','adventure',35,120,'Beginner beach break session.'),
 ('Marrakech','Medina Souk Tour','culture',22,150,'Navigating the old market.'),
 ('Marrakech','Agafay Desert Sunset','adventure',65,300,'Camel ride and dinner.'),
 ('Cape Town','Table Mountain Cable Car','nature',30,150,'Summit views over the bay.'),
 ('Cape Town','Cape Peninsula Drive','nature',85,480,'Chapman''s Peak to the Cape.'),
 ('New York','Broadway Show','culture',140,150,'Orchestra seats.'),
 ('New York','High Line & Chelsea Walk','sightseeing',0,120,'Elevated park to the market.'),
 ('New York','Brooklyn Pizza Tour','food',70,180,'Coal ovens across two boroughs.'),
 ('Mexico City','Teotihuacan Pyramids','culture',55,420,'Avenue of the Dead at dawn.'),
 ('Mexico City','Roma Taco Crawl','food',30,150,'Five stands, one evening.'),
 ('Buenos Aires','Tango Show & Lesson','culture',60,180,'San Telmo milonga.'),
 ('Queenstown','Bungy at Kawarau Bridge','adventure',150,120,'The original 43m jump.'),
 ('Queenstown','Milford Sound Flight','adventure',320,240,'Scenic flight over the fiords.')
) AS v(city, name, category, cost, dur, descr) ON v.city = c.name;
