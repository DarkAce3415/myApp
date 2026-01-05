import Link from 'next/link'

const MainPage = () =>{
  return<>
  <div className="min-h-screen bg-white text-black flex flex-col">

  <nav className="w-full flex justify-between items-center px-8 py-4 border-b border-black">
    <div className="text-2xl font-bold tracking-tight">MyWebsite</div>
    <div className="flex space-x-4">
    <Link href="/login-page" className="px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition">Login</Link>
    <Link href="/register-page" className="px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition">Register</Link>
    </div>
  </nav>



<main className="flex-1 flex flex-col items-center justify-center text-center px-6">
  <h1 className="text-4xl font-bold mb-4">Welcome to MyWebsite</h1>
  <p className="max-w-md text-lg leading-relaxed">
    A clean and minimalistic homepage using only black and white colors. Login or register to get started.
  </p>
</main>



<footer className="py-4 text-center border-t border-black text-sm">
</footer>
</div>
  </>
}

export default MainPage;