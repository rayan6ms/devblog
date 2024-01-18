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
    image: "https://www.coliseugeek.com.br/wp-content/uploads/2023/01/5144d-clickwallpapers-deadpool-marvel-wallpaper-img_6-scaled-1.jpg",
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
    image: "https://hitsite.com.br/wp-content/uploads/2023/01/Drax-de-Dave-Bautista.jpg",
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
    postImage: 'https://www.coliseugeek.com.br/wp-content/uploads/2023/01/5144d-clickwallpapers-deadpool-marvel-wallpaper-img_6-scaled-1.jpg',
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
    postImage: 'https://www.coliseugeek.com.br/wp-content/uploads/2023/01/5144d-clickwallpapers-deadpool-marvel-wallpaper-img_6-scaled-1.jpg',
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

export async function getComments() {
  return comments;
}

export async function getUser() {
  return user;
}

export async function getRecentPosts() {
  return posts.sort(() => Math.random() - 0.5);
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
