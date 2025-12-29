export default function Button({children}: {children: React.ReactNode}) {
    return (
        <button className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors">
            {children}
        </button>
    )
}