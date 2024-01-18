import RecentItem from './RecentItem';
import RecommendedItem from './RecommendedItem';

export default function Main() {
  const posts = [
    { image: "https://revolucaonerd.com/wordpress/wp-content/files/revolucaonerd.com/2023/04/batman-animacao-1024x683.webp", tag: "heróis", title: "Batman cartoon year 1996", author: "Zack Snyder", date: "2023-06-20", views: 100, hasStartedReading: true },
    { image: "https://imagens.brasil.elpais.com/resizer/nCpDbZnTqbBMJsTdXM6xmN17xpg=/1960x0/arc-anglerfish-eu-central-1-prod-prisa.s3.amazonaws.com/public/6TIOUTQV4DCNJTPRHFBQQCYQGA.jpg", tag: "vilões", title: "Joker holding a card wearing a purplsadioasjisdioa asiodhioashiodhioa idsiohahdahfhfh jjjjjj asidoasyhueha7eyu ddddde suit", author: "Heath Ledger", date: "2023-06-21", views: 200, hasStartedReading: false },
    { image: "https://i.etsystatic.com/19286482/r/il/96c0fd/2980731281/il_1080xN.2980731281_j8z4.jpg", tag: "heróis", title: "Iron man cabeça", author: "Rayan", date: "2023-06-22", views: 1024, hasStartedReading: true },
    { image: "https://imageio.forbes.com/specials-images/imageserve/5db83d5a38073500062a7fc0/-Joker-/0x0.jpg?format=jpg&crop=902,507,x370,y188,safe&width=960", tag: "vilões", title: "Joker stairs", author: "Joaquin Phoenix", date: "2023-06-22", views: 300, hasStartedReading: false },
    { image: "https://revolucaonerd.com/wordpress/wp-content/files/revolucaonerd.com/2023/04/batman-animacao-1024x683.webp", tag: "heróis", title: "Batman cartoon year 1996", author: "Zack Snyder", date: "2023-06-20", views: 100, hasStartedReading: true },
  ];

  return (
    <main className="mt-10 mx-auto flex-col items-center md:items-start md:flex-row lg:w-2/3 flex md:justify-center gap-6">
      <div className="flex flex-col gap-6">
        {posts.slice(0, 2).map((post: any, index: any) => (
          <div className="min-h-[320px] w-[300px] max-h-[360px]">
            <RecentItem key={index} {...post} />
          </div>
          ))}
      </div>
      <div className="flex flex-col gap-8 lg:">
        {posts.slice(2, 3).map((post: any, index: any) => (
          <RecentItem key={index + 1} {...post} isBig={ true } />
        ))}
        <div className="flex flex-col">
          {posts.slice(0, 5).map((post: any, index: any) => (
            <RecommendedItem key={index} {...post} pastSecond={ index > 0 } />
          ))}
        </div>
      </div>
    </main>
  );
}