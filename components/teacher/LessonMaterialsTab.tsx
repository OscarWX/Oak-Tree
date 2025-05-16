"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, BookOpen, AlertCircle } from "lucide-react"
import MaterialUploadForm from "./MaterialUploadForm"
import { supabase } from "@/lib/supabase"
import type { Material } from "@/lib/supabase"

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
              <Card key={material.id}>
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
                    <h4 className="text-sm font-medium">AI Summary</h4>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {material.ai_summary || "No summary available"}
                    </p>

                    {material.key_concepts && material.key_concepts.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium mb-1">Key Concepts</h4>
                        <div className="flex flex-wrap gap-1">
                          {material.key_concepts.slice(0, 3).map((concept: any, index: number) => (
                            <div key={index} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                              {concept.concept}
                            </div>
                          ))}
                          {material.key_concepts.length > 3 && (
                            <div className="text-xs bg-muted px-2 py-1 rounded-full">
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
