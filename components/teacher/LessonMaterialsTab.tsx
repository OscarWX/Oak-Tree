"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, BookOpen, AlertCircle, Maximize2 } from "lucide-react"
import MaterialUploadForm from "./MaterialUploadForm"
import { supabase } from "@/lib/supabase"
import type { Material } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface LessonMaterialsTabProps {
  lessonId: string
  lessonTitle: string
}

export default function LessonMaterialsTab({ lessonId, lessonTitle }: LessonMaterialsTabProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("existing")

  useEffect(() => {
    fetchMaterials()
  }, [lessonId])

  const fetchMaterials = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMaterials(data || [])
    } catch (error) {
      console.error("Error fetching materials:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMaterialUploaded = (material: Material) => {
    setMaterials((prev) => [material, ...prev])
    setActiveTab("existing")
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{lessonTitle} Materials</h2>
        <TabsList>
          <TabsTrigger value="existing">Existing Materials</TabsTrigger>
          <TabsTrigger value="upload">Upload New</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="existing" className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent"></div>
          </div>
        ) : materials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((material) => (
              <Card key={material.id} data-material-id={material.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {material.content_type === "text" ? (
                        <BookOpen className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-green-600" />
                      )}
                      <CardTitle className="text-lg">{material.title}</CardTitle>
                    </div>
                    {material.file_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {new Date(material.created_at).toLocaleDateString()} • {material.content_type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">AI Summary</h4>
                      {material.ai_summary && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="text-green-600 hover:text-green-800 transition-colors summary-expand-button" title="View full summary">
                              <Maximize2 className="h-4 w-4" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Summary: {material.title}</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              <h3 className="text-lg font-medium mb-2">Summary</h3>
                              <div className="text-sm mb-6">
                                {material.ai_summary.split('\n').map((paragraph, i) => (
                                  <p key={i} className="mb-4">{paragraph}</p>
                                ))}
                              </div>
                              
                              {material.key_concepts && material.key_concepts.length > 0 && (
                                <>
                                  <h3 className="text-lg font-medium mb-2">Key Concepts</h3>
                                  <div className="space-y-3">
                                    {material.key_concepts.map((concept: any, index: number) => (
                                      <div key={index} className="border-l-2 border-green-600 pl-3 py-1">
                                        <h4 className="text-sm font-semibold text-green-700">{concept.concept}</h4>
                                        {concept.description && (
                                          <p className="text-sm text-muted-foreground">{concept.description}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {material.ai_summary || "No summary available"}
                    </p>

                    {material.key_concepts && material.key_concepts.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium">Key Concepts</h4>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {material.key_concepts.slice(0, 3).map((concept: any, index: number) => (
                            <div key={index} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                              {concept.concept}
                            </div>
                          ))}
                          {material.key_concepts.length > 3 && (
                            <div 
                              className="text-xs bg-muted px-2 py-1 rounded-full cursor-pointer hover:bg-gray-200" 
                              onClick={() => {
                                // Find the summary expand button and click it
                                const summaryButton = document.querySelector(`[data-material-id="${material.id}"] .summary-expand-button`);
                                if (summaryButton) {
                                  (summaryButton as HTMLButtonElement).click();
                                }
                              }}
                            >
                              +{material.key_concepts.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Materials Yet</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Upload your first material to help students learn about this topic
              </p>
              <Button onClick={() => setActiveTab("upload")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Material
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="upload">
        <Card>
          <CardHeader>
            <CardTitle>Upload New Material</CardTitle>
            <CardDescription>Add text content or upload files for students to learn from</CardDescription>
          </CardHeader>
          <CardContent>
            <MaterialUploadForm lessonId={lessonId} onSuccess={handleMaterialUploaded} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
