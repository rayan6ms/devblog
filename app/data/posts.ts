import slugify from "slugify";

const posts = [
  {
    image: "https://revolucaonerd.com/wordpress/wp-content/files/revolucaonerd.com/2023/04/batman-animacao-1024x683.webp",
    mainTag: "heróis",
    tags: ["animação", "DC", "Gotham"],
    title: "Batman cartoon year 1996",
    author: "Zack Snyder",
    date: "2023-06-20",
    views: 100,
    hasStartedReading: true,
    percentRead: 63,
    description: "Mergulhe no universo sombrio de Gotham na icônica série de animação Batman de 1996, dirigida por Zack Snyder."
  },
  {
    image: "https://imagens.brasil.elpais.com/resizer/nCpDbZnTqbBMJsTdXM6xmN17xpg=/1960x0/arc-anglerfish-eu-central-1-prod-prisa.s3.amazonaws.com/public/6TIOUTQV4DCNJTPRHFBQQCYQGA.jpg",
    mainTag: "vilões",
    tags: ["Coringa", "cartas", "DC"],
    title: "Joker holding a card wearing a purple suit",
    author: "Heath Ledger",
    date: "2023-06-21",
    views: 200,
    hasStartedReading: false,
    percentRead: 0,
    description: "Explore a mente torturada do infame Coringa interpretado por Heath Ledger, nesta imagem ele segura um naipe de cartas, sorrindo com seu inesquecível sorriso sinistro."
  },
  {
    image: "https://i.etsystatic.com/19286482/r/il/96c0fd/2980731281/il_1080xN.2980731281_j8z4.jpg",
    mainTag: "heróis",
    tags: ["Iron Man", "Marvel", "Tecnologia"],
    title: "Iron man cabeça",
    author: "Rayan",
    date: "2023-06-22",
    views: 1024,
    hasStartedReading: true,
    percentRead: 56,
    description: "Descubra o fascinante mundo tecnológico de Tony Stark com esta incrível representação da icônica armadura do Homem de Ferro."
  },
  {
    image: "https://imageio.forbes.com/specials-images/imageserve/5db83d5a38073500062a7fc0/-Joker-/0x0.jpg?format=jpg&crop=902,507,x370,y188,safe&width=960",
    mainTag: "vilões",
    tags: ["Coringa", "DC", "Transformação"],
    title: "Joker stairs",
    author: "Joaquin Phoenix",
    date: "2023-06-22",
    views: 300,
    hasStartedReading: false,
    percentRead: 0,
    description: "Uma lembrança vívida da transformação do personagem Arthur Fleck no Coringa, interpretado de forma brilhante por Joaquin Phoenix. A icônica cena da escadaria nunca será esquecida."
  },
  {
    image: "https://revolucaonerd.com/wordpress/wp-content/files/revolucaonerd.com/2023/06/batman-ben-affleck.webp",
    mainTag: "heróis",
    tags: ["Batman", "Animação", "Sombrio"],
    title: "Batman cartoon revisited",
    author: "Zack Snyder",
    date: "2023-06-24",
    views: 120,
    hasStartedReading: false,
    percentRead: 0,
    description: "Revisite o universo gótico de Batman na clássica série animada de 1996, onde cada sombra conta uma história."
  },
  {
    image: "https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/2023/11/deadpool-3-ryan-reynolds.jpg?w=1200&h=900&crop=1",
    mainTag: "anti-heróis",
    tags: ["Deadpool", "Marvel", "Comédia"],
    title: "Deadpool smirk face",
    author: "Ryan Reynolds",
    date: "2023-06-12",
    views: 10240,
    hasStartedReading: true,
    percentRead: 0,
    description: "Aproveite a oportunidade para se familiarizar com o mercenário tagarela mais amado do mundo, Deadpool, interpretado por Ryan Reynolds."
  },
  {
    image: "https://revolucaonerd.com/wordpress/wp-content/files/revolucaonerd.com/2022/08/thor.webp",
    mainTag: "heróis",
    tags: ["Marvel", "Thor", "Deuses"],
    title: "The mighty Thor",
    author: "Chris Hemsworth",
    date: "2023-06-25",
    views: 250,
    hasStartedReading: false,
    percentRead: 0,
    description: "Mergulhe no mundo mítico de Asgard e descubra a saga do deus do trovão, Thor, interpretado por Chris Hemsworth."
  },
  {
    image: "https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg",
    mainTag: "aventureiros",
    tags: ["Guardiões", "Marvel", "Espaço"],
    title: "Star-Lord: O Líder dos Guardiões",
    author: "Chris Pratt",
    date: "2023-06-26",
    views: 4204,
    hasStartedReading: false,
    percentRead: 0,
    description: "Viaje pelo cosmos com Peter Quill, também conhecido como Star-Lord, o carismático líder dos Guardiões da Galáxia."
  },
  {
    image: "https://epipoca.com.br/wp-content/uploads/2021/02/Avengers-Infinity-War-Gamora-1200x600-1.jpg",
    mainTag: "aliens",
    tags: ["Verde", "Lutadora", "Guardiões"],
    title: "Gamora: A Assassina Mortal",
    author: "Zoe Saldana",
    date: "2023-06-27",
    views: 380,
    hasStartedReading: true,
    percentRead: 10,
    description: "Descubra mais sobre Gamora, a assassina adotada por Thanos e membro-chave dos Guardiões da Galáxia."
  },
  {
    image: "https://www.wallpaperflare.com/static/41/645/302/avengers-infinity-war-dave-bautista-drax-4k-wallpaper.jpg",
    mainTag: "monstros",
    tags: ["Força", "Guardiões", "Sensível"],
    title: "Drax: O Destruidor",
    author: "Dave Bautista",
    date: "2023-06-28",
    views: 420,
    hasStartedReading: false,
    percentRead: 0,
    description: "Mergulhe na história de Drax, o Destruidor, um guerreiro em busca de vingança e membro dos Guardiões da Galáxia."
  },
  {
    image: "https://wallpapercave.com/wp/wp2163723.jpg",
    mainTag: "robôs",
    tags: ["Guardiões", "Metálico", "Tecnologia"],
    title: "Rocket: O Guaxinim Genial",
    author: "Bradley Cooper",
    date: "2023-06-29",
    views: 470,
    hasStartedReading: true,
    percentRead: 5,
    description: "Conheça Rocket, o guaxinim genial com uma queda por armas e explosivos, membro icônico dos Guardiões da Galáxia."
  },
  {
    image: "https://ovicio.com.br/wp-content/uploads/2023/04/20230425-ovicio-guardioes-galaxia-groot.jpg",
    mainTag: "árvores",
    tags: ["Guardiões", "Fala", "Amigo"],
    title: "Groot: O Guardião Frondoso",
    author: "Vin Diesel",
    date: "2023-06-30",
    views: 500,
    hasStartedReading: false,
    percentRead: 0,
    description: "Descubra a história por trás de Groot, a árvore falante e leal amigo de Rocket, que conquistou corações em Guardiões da Galáxia."
  },
  {
    image: "https://uploads.jovemnerd.com.br/wp-content/uploads/2018/02/capitao-america-novo-escudo-vingadores-guerra-infinita.png",
    mainTag: "líderes",
    tags: ["Vingadores", "Marvel", "S.H.I.E.L.D."],
    title: "Capitão América: O Primeiro Vingador",
    author: "Chris Evans",
    date: "2023-07-01",
    views: 520,
    hasStartedReading: true,
    percentRead: 15,
    description: "Acompanhe a trajetória de Steve Rogers, o Capitão América, desde seu início frágil até se tornar o líder dos Vingadores."
  },
  {
    image: "https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640",
    mainTag: "bilionários",
    tags: ["Vingadores", "Tecnologia", "Homem de Ferro"],
    title: "Tony Stark: O Homem de Ferro",
    author: "Robert Downey Jr.",
    date: "2023-07-02",
    views: 650,
    hasStartedReading: true,
    percentRead: 20,
    description: "Entre no mundo de Tony Stark, o gênio, bilionário e playboy filantropo que se tornou o Homem de Ferro, coração e alma dos Vingadores."
  },
  {
    image: "https://soundvenue.com/wp-content/uploads/2018/01/scarlett-johansson-3840x2160-black-widow-captain-america-civil-war-4k-755-2192x1233.jpg",
    mainTag: "espiões",
    tags: ["Vingadores", "S.H.I.E.L.D.", "Assassina"],
    title: "Viúva Negra: A Espiã Lendária",
    author: "Scarlett Johansson",
    date: "2023-07-04",
    views: 480,
    hasStartedReading: false,
    percentRead: 0,
    description: "Descubra os segredos e mistérios por trás de Natasha Romanoff, a Viúva Negra, uma das espiãs mais habilidosas do mundo e membro vital dos Vingadores."
  },
  {
    image: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296",
    mainTag: "arqueiros",
    tags: ["Vingadores", "S.H.I.E.L.D.", "Flechas"],
    title: "Gavião Arqueiro: O Atirador Preciso",
    author: "Jeremy Renner",
    date: "2023-07-05",
    views: 440,
    hasStartedReading: true,
    percentRead: 8,
    description: "Mire no mundo de Clint Barton, o Gavião Arqueiro, cuja precisão e lealdade o tornaram uma parte indispensável dos Vingadores."
  },
  {
    image: "https://i0.wp.com/cinegrandiose.com/wp-content/uploads/Black-Panther-2.png?fit=960%2C540&ssl=1",
    mainTag: "heróis",
    tags: ["Marvel", "Wakanda", "Tecnologia"],
    title: "Black Panther: O Rei de Wakanda",
    author: "Chadwick Boseman",
    date: "2023-07-06",
    views: 710,
    hasStartedReading: true,
    percentRead: 35,
    description: "Explore o legado do rei T'Challa, o Pantera Negra, e a sua luta para proteger o reino tecnológico de Wakanda."
  },
  {
    image: "https://media.newyorker.com/photos/593581e785bd115baccba6d2/master/pass/Lane-Ten-Things-about-Wonder-Woman.jpg",
    mainTag: "heróis",
    tags: ["DC", "Amazona", "Mulheres Fortes"],
    title: "Wonder Woman: A Guerreira Amazona",
    author: "Gal Gadot",
    date: "2023-07-07",
    views: 800,
    hasStartedReading: false,
    percentRead: 0,
    description: "Descubra a poderosa história de Diana Prince, a Mulher Maravilha, enquanto ela luta por justiça e igualdade como uma das maiores heroínas do mundo."
  },
  {
    image: "https://gamehall.com.br/wp-content/uploads/2022/07/spider-man-pc-780x470.webp",
    mainTag: "heróis",
    tags: ["Marvel", "Adolescente", "Nova York"],
    title: "Spider-Man: O Amigo da Vizinhança",
    author: "Tom Holland",
    date: "2023-07-08",
    views: 920,
    hasStartedReading: true,
    percentRead: 45,
    description: "Siga Peter Parker enquanto ele equilibra a vida de um estudante comum com a responsabilidade de ser o Homem-Aranha, o herói de Nova York."
  },
  {
    image: "https://cdn.marvel.com/content/1x/captainmarvel_lob_mas_mob_03_0.jpg",
    mainTag: "heróis",
    tags: ["Marvel", "Poder Cósmico", "Kree"],
    title: "Captain Marvel: A Heroína Cósmica",
    author: "Brie Larson",
    date: "2023-07-09",
    views: 610,
    hasStartedReading: true,
    percentRead: 22,
    description: "Conheça Carol Danvers, também conhecida como Capitã Marvel, a heroína mais poderosa do universo Marvel, com habilidades cósmicas que desafiam os limites da imaginação."
  },
  {
    image: "https://www.geo.tv/assets/uploads/updates/2024-08-09/558383_2876258_updates.jpg",
    mainTag: "vilões",
    tags: ["Marvel", "Titã Louco", "Infinito"],
    title: "Thanos: O Titã Louco",
    author: "Josh Brolin",
    date: "2023-07-10",
    views: 990,
    hasStartedReading: false,
    percentRead: 0,
    description: "Reviva a saga do Titã Louco, Thanos, em sua busca pelas Joias do Infinito para impor sua visão de equilíbrio ao universo, tornando-se um dos vilões mais formidáveis da Marvel."
  },
  {
    image: "https://miro.medium.com/v2/resize:fit:1400/1*9XQlc5ayl-KL7l4Ox7aSrg.jpeg",
    mainTag: "anti-heróis",
    tags: ["Marvel", "Magia", "Multiverso"],
    title: "Scarlet Witch: A Feiticeira do Caos",
    author: "Elizabeth Olsen",
    date: "2023-07-11",
    views: 850,
    hasStartedReading: true,
    percentRead: 30,
    description: "Entre no mundo caótico de Wanda Maximoff, também conhecida como Feiticeira Escarlate, cujo poder de manipular a realidade a tornou uma figura complexa entre heroína e vilã."
  },
  {
    image: "https://myfamilycinema.com/wp-content/uploads/2022/06/loki.jpg",
    mainTag: "vilões",
    tags: ["Marvel", "Trickster", "Deuses"],
    title: "Loki: O Deus da Trapaça",
    author: "Tom Hiddleston",
    date: "2023-07-12",
    views: 1100,
    hasStartedReading: false,
    percentRead: 0,
    description: "Siga o Deus da Trapaça, Loki, em suas intrigas e manipulações no universo Marvel, sempre oscilando entre ser herói e vilão."
  },
  {
    image: "https://static.itapemafm.com.br/s3fs-public/styles/itapema_blog_post_header/public/2020-06/henry%20cavill%20superman.jpg?c6c9L4CmsU1W5vv1Uxr1IRL33YNObrTs&itok=NNCHm8MU",
    mainTag: "heróis",
    tags: ["DC", "Krypton", "Poderes"],
    title: "Superman: O Último Filho de Krypton",
    author: "Henry Cavill",
    date: "2023-07-13",
    views: 900,
    hasStartedReading: true,
    percentRead: 55,
    description: "Acompanhe Clark Kent, o Superman, enquanto ele protege a Terra com seus incríveis poderes, equilibrando sua identidade humana e kryptoniana."
  },
  {
    image: "https://uploads.jovemnerd.com.br/wp-content/uploads/2023/10/venom_hqs_para_conhecer__1a0lr23.jpg?ims=1210x544/filters:quality(75)",
    mainTag: "anti-heróis",
    tags: ["Marvel", "Simbiote", "Veneno"],
    title: "Venom: O Anti-Herói Letal",
    author: "Tom Hardy",
    date: "2023-07-14",
    views: 780,
    hasStartedReading: false,
    percentRead: 0,
    description: "Explore a conexão entre Eddie Brock e o simbionte alienígena Venom, que juntos formam um dos anti-heróis mais letalmente carismáticos do universo Marvel."
  },
  {
    image: "https://s2-techtudo.glbimg.com/7JZ5j1VD4yJt1LVWLuE7IPeow4E=/1200x/smart/filters:cover():strip_icc()/i.s3.glbimg.com/v1/AUTH_08fbf48bc0524877943fe86e43087e7a/internal_photos/bs/2023/t/m/QGZAUMTRiMoy4EdY1AOg/the-flash.jpg",
    mainTag: "heróis",
    tags: ["DC", "Velocidade", "Força da Aceleração"],
    title: "Flash: O Homem Mais Rápido do Mundo",
    author: "Grant Gustin",
    date: "2023-07-15",
    views: 680,
    hasStartedReading: true,
    percentRead: 40,
    description: "Corra com Barry Allen, o Flash, o homem mais rápido do mundo, enquanto ele protege Central City e explora os mistérios da Força da Aceleração."
  },
  {
    image: "https://lojalimitededition.vteximg.com.br/arquivos/ids/430973-468-675/image-b34a988914e042b68c965316038557cb.jpg?v=638330709190230000",
    mainTag: "heróis",
    tags: ["Dark Horse", "lendas"],
    title: "Hellboy fighting mythical creatures",
    author: "Mike Mignola",
    date: "2023-09-25",
    views: 160,
    hasStartedReading: true,
    percentRead: 40,
    description: "Explore o mundo sombrio de Hellboy enquanto ele confronta criaturas míticas e desvendam segredos ocultos."
  },
  {
    image: "https://i.pinimg.com/564x/9b/b4/55/9bb4555c9fb02a5b659726f7533fbf91.jpg",
    mainTag: "heróis",
    tags: ["Marvel", "sangue"],
    title: "Moon Knight stalking the night",
    author: "Doug Moench",
    date: "2023-09-26",
    views: 185,
    hasStartedReading: false,
    percentRead: 0,
    description: "Acompanhe o Justiceiro da noite, Moon Knight, enquanto ele combate o crime e enfrenta seus demônios internos."
  },
  {
    image: "https://static.wikia.nocookie.net/arrow/images/7/76/John_Constantine.png/revision/latest?cb=20210930204848&path-prefix=pt-br",
    mainTag: "vilões",
    tags: ["DC", "mágica"],
    title: "Constantine dealing with dark forces",
    author: "Alan Moore",
    date: "2023-09-27",
    views: 210,
    hasStartedReading: true,
    percentRead: 65,
    description: "Aventure-se no mundo de John Constantine, onde magia e manipulação o colocam contra forças sobrenaturais."
  },
  {
    image: "https://uploads.jovemnerd.com.br/wp-content/uploads/2017/10/optimus.jpg?ims=1210x544/filters:quality(75)",
    mainTag: "heróis",
    tags: ["IDW", "robot"],
    title: "Transformers battling Decepticons",
    author: "Bob Budiansky",
    date: "2023-09-28",
    views: 170,
    hasStartedReading: false,
    percentRead: 0,
    description: "Entre na guerra entre Autobots e Decepticons, onde robôs se transformam em máquinas de combate em uma luta épica."
  },
  {
    image: "https://static.wikia.nocookie.net/marveldatabase/images/b/b5/Carnage_Vol_3_1_Textless.png/revision/latest/scale-to-width-down/614?cb=20220224044537",
    mainTag: "vilões",
    tags: ["Marvel", "maldição"],
    title: "Carnage unleashing chaos",
    author: "David Michelinie",
    date: "2023-09-30",
    views: 240,
    hasStartedReading: false,
    percentRead: 0,
    description: "Sinta a fúria de Carnage, o simbiótico que não conhece limites e está determinado a espalhar o caos."
  },
  {
    image: "https://media.gq.com/photos/66049ca2d6bafed5ec9b791f/4:3/w_2328,h_1746,c_limit/AAM0370_comp_Tk2_v001_r709.117420_C.jpg",
    mainTag: "heróis",
    tags: ["Marvel", "X-Men"],
    title: "Cyclops leading the X-Men",
    author: "Stan Lee",
    date: "2023-10-01",
    views: 190,
    hasStartedReading: true,
    percentRead: 50,
    description: "Siga Ciclope enquanto ele lidera os X-Men na luta pela igualdade entre humanos e mutantes."
  },
  {
    image: "https://static1.moviewebimages.com/wordpress/wp-content/uploads/2022/12/x-men-halle-berry-storm.jpeg",
    mainTag: "heróis",
    tags: ["Marvel", "X-Men"],
    title: "Storm controlling the weather",
    author: "Len Wein",
    date: "2023-10-02",
    views: 175,
    hasStartedReading: false,
    percentRead: 0,
    description: "Experimente o poder de Tempestade, uma das mutantes mais poderosas, enquanto ela manipula o clima com maestria."
  },
  {
    image: "https://i.insider.com/66bdd07b5da406397bf61f18?width=700",
    mainTag: "heróis",
    tags: ["Marvel", "Defensores"],
    title: "Daredevil fighting crime in Hell's Kitchen",
    author: "Frank Miller",
    date: "2023-10-03",
    views: 210,
    hasStartedReading: true,
    percentRead: 60,
    description: "Acompanhe o Demolidor enquanto ele protege Hell's Kitchen, usando seus sentidos aguçados e habilidades de combate."
  },
  {
    image: "https://cinebuzz.com.br/media/uploads/magneto.jpg",
    mainTag: "vilões",
    tags: ["Marvel", "X-Men"],
    title: "Magneto's plan for mutant supremacy",
    author: "Stan Lee",
    date: "2023-10-06",
    views: 250,
    hasStartedReading: false,
    percentRead: 0,
    description: "Mergulhe na mente de Magneto, o Mestre do Magnetismo, enquanto ele busca garantir um futuro para os mutantes."
  },
  {
    image: "https://www.kametoys.cl/wp-content/uploads/2019/01/marvel-ant-man-sixth-scale-figure-hot-toys-903697-20.jpg",
    mainTag: "heróis",
    tags: ["Marvel", "Avengers"],
    title: "Ant-Man shrinking into action",
    author: "Stan Lee",
    date: "2023-10-09",
    views: 150,
    hasStartedReading: true,
    percentRead: 30,
    description: "Descubra as aventuras de Ant-Man, o herói que pode encolher e se comunicar com formigas, enquanto ele luta ao lado dos Vingadores e enfrenta desafios em miniatura."
  }
];

const comments = [
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodales fermentum, odio nisl ultricies nunc',
    postTitle: 'Lorem ipsum dolor sit asdada sadasdada dsds sds amet',
    postImage: 'https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296',
    postedAt: '2 hours ago',
    edited: false,
    editedAt: '',
  },
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodasahdioahsihod ioasdhioashidhiahsiohfiohai siagdasgudgu sduashdua ushdushdhush sdsdssd les fermentum, odio nisl ultricies nunc',
    postTitle: 'Lorem ipsum dolor sit sdsds sdsdsdsamet',
    postImage: 'https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg',
    postedAt: '2 hours ago',
    edited: true,
    editedAt: '1 hour ago',
  },
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodales fermentum, odio nisl ultricies nunc',
    postTitle: 'Lorem ipsum dolorsdsds sdsds sdsdsds sdsdsdsdsd sdsdsdsd sit amet',
    postImage: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/2023/11/deadpool-3-ryan-reynolds.jpg?w=1200&h=900&crop=1',
    postedAt: '2 hours ago',
    edited: false,
    editedAt: '',
  },
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodales fermentum, odio nisl ultricies nunc',
    postTitle: 'Lorem ipsum dolor sit amet',
    postImage: 'https://imageio.forbes.com/specials-images/imageserve/5db83d5a38073500062a7fc0/-Joker-/0x0.jpg?format=jpg&crop=902,507,x370,y188,safe&width=960',
    postedAt: '2 hours ago',
    edited: true,
    editedAt: '30 minutes ago',
  },
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodales fermentum, odio nisl ultricies nunc',
    postTitle: 'Lorem ipsum dolor sit amet',
    postImage: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/2023/11/deadpool-3-ryan-reynolds.jpg?w=1200&h=900&crop=1',
    postedAt: '2 hours ago',
    edited: false,
    editedAt: '',
  },
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodales fermentum, odio nisl ultricies nunc',
    postTitle: 'Lorem ipsum dolor sit amet',
    postImage: 'https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296',
    postedAt: '2 hours ago',
    edited: false,
    editedAt: '',
  },
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodales fermentum, odio nisl ultricies nunc',
    postTitle: 'Lorem ipsum dolor sit amet',
    postImage: 'https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg',
    postedAt: '2 hours ago',
    edited: true,
    editedAt: '1 hour ago',
  },
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodales fermentum, odio nisl ultricies nunc',
    postTitle: 'Lorem ipsum dolor sit amet',
    postImage: 'https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg',
    postedAt: '2 hours ago',
    edited: true,
    editedAt: '1 hour ago',
  },
];

const user = {
  name: 'John Doe',
  role: 'owner',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet sodales fermentum, odio nisl dasdas sadasdasd sdsds dssdsdsdsds sdsds sdsdsdsd sdsdsds sdsdsd sdsd dsdsd ultricies nunc',
  profilePicture: 'https://wallpapercave.com/wp/wp2163723.jpg',
  socialLinks: {
    linkedin: 'https://linkedin.com/in/username',
    github: 'https://github.com/username',
    youtube: 'https://youtube.com/user/username',
    twitter: 'https://twitter.com/username',
  },
};

export interface IPost {
  image: string;
  mainTag: string;
  tags: string[];
  title: string;
  author: string;
  date: string;
  views: number;
  hasStartedReading: boolean;
  percentRead: number;
  description: string;
}

export interface IComment {
  content: string;
  postTitle: string;
  postImage: string;
  postedAt: string;
  edited: boolean;
  editedAt: string;
};

export interface IUser {
  name: string;
  role: string;
  description: string;
  profilePicture: string;
  socialLinks: {
    linkedin: string;
    github: string;
    youtube: string;
    twitter: string;
  };
};

export async function getSearchSuggestions(query: string) {
  const lowerQuery = query.toLowerCase();
  return posts.filter((post) => 
    post.title.toLowerCase().includes(lowerQuery) ||
    post.author.toLowerCase().includes(lowerQuery) ||
    post.mainTag.toLowerCase().includes(lowerQuery) ||
    post.description.toLowerCase().includes(lowerQuery)
  ).slice(0, 5);
}

export async function getPostsByQuery(query: string) {
  const lowerQuery = query.toLowerCase();
  return posts.filter((post) => 
    post.title.toLowerCase().includes(lowerQuery) ||
    post.author.toLowerCase().includes(lowerQuery) ||
    post.mainTag.toLowerCase().includes(lowerQuery) ||
    post.description.toLowerCase().includes(lowerQuery)
  );
}

export async function getPostsByQueryPaginated(
  query: string,
  page: number = 1,
  limit: number = 10
): Promise<GetRecentPostsResponse> {
  const lowerQuery = query.toLowerCase().trim();
  const filtered = posts.filter((post) =>
    post.title.toLowerCase().includes(lowerQuery) ||
    post.author.toLowerCase().includes(lowerQuery) ||
    post.mainTag.toLowerCase().includes(lowerQuery) ||
    post.description.toLowerCase().includes(lowerQuery)
  );

  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    posts: filtered.slice(start, end),
    total: filtered.length,
  };
}

export async function getComments() {
  return comments;
}

export async function getUser() {
  return user;
}

export async function getRandomPosts() {
  const shuffledPosts = [...posts];
  for (let i = shuffledPosts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPosts[i], shuffledPosts[j]] = [shuffledPosts[j], shuffledPosts[i]];
  }
  return shuffledPosts;
}

export type GetRecentPostsResponse = { posts: IPost[]; total: number };

export async function getRecentPosts(
  page: number = 1,
  limit: number = 10
): Promise<GetRecentPostsResponse> {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedPosts = posts.slice(start, end);
  return { posts: paginatedPosts, total: posts.length };
}

export async function getTrendingPosts() {
  return posts.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getRecommendedPosts() {
  return posts.sort((a, b) => a.views - b.views);
}

export const getFilteredPosts = async (tagsArray: string[]): Promise<IPost[]> => {
  const slugifiedPosts = posts.map(post => ({
    ...post,
    tags: post.tags.map(tag => slugify(tag, { lower: true, strict: true })),
    mainTag: slugify(post.mainTag, { lower: true, strict: true })
  }));

  return slugifiedPosts.filter(post =>
    tagsArray.some(tag => post.tags.includes(tag) || post.mainTag === tag)
  );
};

export const getAllMainTags = () => {
  const mainTagsSet = new Set(posts.map(post => post.mainTag.toLowerCase()));
  return Array.from(mainTagsSet);
};

export const getAllOtherTags = (): string[] => {
  const otherTagsSet = new Set();
  posts.forEach(post => post.tags.forEach(tag => otherTagsSet.add(tag.toLowerCase())));
  return Array.from(otherTagsSet) as string[];
};
