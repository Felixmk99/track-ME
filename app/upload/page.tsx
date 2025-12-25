import { CsvUploader } from "@/components/upload/csv-uploader";

export default function UploadPage() {
    return (
        <div className="container max-w-4xl py-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Data Upload</h1>
                <p className="text-muted-foreground">
                    Import your data from the Visible app to start analyzing your trends.
                </p>
            </div>

            <CsvUploader />

            <div className="bg-muted/50 rounded-lg p-6 text-sm text-muted-foreground">
                <h3 className="font-semibold mb-2 text-foreground">Instructions</h3>
                <ul className="list-disc pl-4 space-y-1">
                    <li>Open the Visible App on your phone.</li>
                    <li>Go to Settings {'>'} Export Data.</li>
                    <li>Email the CSV file to yourself or save it to your device.</li>
                    <li>Upload the CSV file here.</li>
                </ul>
            </div>
        </div>
    )
}
