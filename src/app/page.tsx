
"use client";
import { useState, useEffect, useMemo } from 'react';
import { storage } from '@/lib/firebase';
import { ref, listAll, getMetadata, getDownloadURL, deleteObject } from 'firebase/storage';
import FileUploader, { type UploadedFile } from '@/components/file-uploader';
import FileList from '@/components/file-list';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Logo from '@/components/logo';
import { ExternalLink, Search, X as ClearIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';

export type SortKey = 'name' | 'size' | 'type' | 'uploadedAt';
export type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        const listRef = ref(storage, 'uploads/');
        const res = await listAll(listRef);
        
        const filesPromises = res.items.map(async (itemRef) => {
          const [metadata, url] = await Promise.all([
            getMetadata(itemRef),
            getDownloadURL(itemRef)
          ]);
          
          const tags = metadata.customMetadata?.tags ? JSON.parse(metadata.customMetadata.tags) : [];
          
          return {
            name: metadata.name,
            size: metadata.size,
            type: metadata.contentType || 'application/octet-stream',
            url: url,
            tags: tags,
            fullPath: itemRef.fullPath,
            uploadedAt: metadata.timeCreated,
          };
        });
        
        const fetchedFiles = await Promise.all(filesPromises);
        setFiles(fetchedFiles);
      } catch (error) {
        console.error("Error fetching files:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch files from storage." });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFiles();
  }, [toast]);

  const handleUploadSuccess = (newFile: UploadedFile) => {
    setFiles(prevFiles => {
      const existingFileIndex = prevFiles.findIndex(f => f.name === newFile.name);
      if (existingFileIndex !== -1) {
        const updatedFiles = [...prevFiles];
        updatedFiles[existingFileIndex] = newFile;
        return updatedFiles;
      } else {
        return [newFile, ...prevFiles];
      }
    });
  };

  const handleFileDelete = async (fullPath: string) => {
    const fileRef = ref(storage, fullPath);
    try {
      await deleteObject(fileRef);
      setFiles(prevFiles => prevFiles.filter(file => file.fullPath !== fullPath));
      toast({ title: "✅ Success", description: `File was deleted from storage.` });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the file from storage." });
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'uploadedAt' ? 'desc' : 'asc');
    }
  };

  const fileTypes = useMemo(() => {
    const types = new Set(files.map(file => file.type));
    return ['all', ...Array.from(types)];
  }, [files]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterDate(undefined);
  };

  const sortedAndFilteredFiles = useMemo(() => {
    let result = [...files];

    // Filtering
    if (searchTerm) {
      result = result.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      result = result.filter(file => file.type === filterType);
    }
    
    if (filterDate?.from) {
      result = result.filter(file => {
        const uploadedDate = new Date(file.uploadedAt);
        const fromDate = new Date(filterDate.from!);
        fromDate.setHours(0, 0, 0, 0); // Start of the day
        
        if (!filterDate.to) {
          const fromDateEnd = new Date(fromDate);
          fromDateEnd.setHours(23, 59, 59, 999);
          return uploadedDate >= fromDate && uploadedDate <= fromDateEnd;
        }

        const toDate = new Date(filterDate.to);
        toDate.setHours(23, 59, 59, 999); // End of the day

        return uploadedDate >= fromDate && uploadedDate <= toDate;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      let comparison = 0;
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, searchTerm, sortKey, sortDirection, filterType, filterDate]);

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline">Cloud File Saver</h1>
              <p className="text-muted-foreground">Store, tag, and manage your files with ease.</p>
            </div>
          </div>
          <a
            href="https://console.cloud.google.com/storage/browser/almacenador-cloud.appspot.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">View Bucket</span>
          </a>
        </header>
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle>Upload Your Files</CardTitle>
            <CardDescription>Drag and drop files here or click to browse. AI will automatically generate tags.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader onUploadSuccess={handleUploadSuccess} />
          </CardContent>
        </Card>
        
        <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">My Files</h2>
            <Card className="mb-4 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search by name */}
                  <div className="relative lg:col-span-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          type="search"
                          placeholder="Filter by file name..."
                          className="w-full pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  {/* Filter by type */}
                  <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full">
                          <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                          {fileTypes.map(type => (
                              <SelectItem key={type} value={type}>
                                  {type === 'all' ? 'All Types' : type}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  {/* Filter by date */}
                   <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !filterDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDate?.from ? (
                            filterDate.to ? (
                                <>
                                {format(filterDate.from, "LLL dd, y")} -{" "}
                                {format(filterDate.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(filterDate.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Filter by upload date</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={filterDate?.from}
                            selected={filterDate}
                            onSelect={setFilterDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
              </div>
              {(searchTerm || filterType !== 'all' || filterDate) && (
                  <Button variant="ghost" onClick={clearFilters} className="mt-4 text-sm text-muted-foreground">
                      <ClearIcon className="mr-2 h-4 w-4" />
                      Clear Filters
                  </Button>
              )}
            </Card>

            <FileList 
                files={sortedAndFilteredFiles} 
                onFileDelete={handleFileDelete} 
                isLoading={isLoading}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
            />
        </div>

      </div>
    </main>
  );
}
