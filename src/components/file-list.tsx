
"use client";
import { UploadedFile, SortKey, SortDirection } from '@/app/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface FileListProps {
  files: UploadedFile[];
  onFileDelete: (path: string) => void;
  isLoading: boolean;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}

export default function FileList({ files, onFileDelete, isLoading, sortKey, sortDirection, onSort }: FileListProps) {
    
    const renderSortArrow = (key: SortKey) => {
        if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        return sortDirection === 'asc' 
            ? <ArrowUpDown className="ml-2 h-4 w-4 transform rotate-180" /> 
            : <ArrowUpDown className="ml-2 h-4 w-4" />;
    };

    return (
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => onSort('name')}>
                        <div className="flex items-center">Name {renderSortArrow('name')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => onSort('size')}>
                        <div className="flex items-center">Size {renderSortArrow('size')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => onSort('type')}>
                        <div className="flex items-center">Type {renderSortArrow('type')}</div>
                    </TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => onSort('uploadedAt')}>
                        <div className="flex items-center">Uploaded {renderSortArrow('uploadedAt')}</div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                ) : files.length > 0 ? (
                    files.map((file) => (
                        <TableRow key={file.fullPath}>
                            <TableCell className="font-medium max-w-xs truncate" title={file.name}>{file.name}</TableCell>
                            <TableCell>{(file.size / 1024).toFixed(2)} KB</TableCell>
                            <TableCell>{file.type}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                {file.tags.map((tag, index) => <Badge key={index} variant="secondary">{tag}</Badge>)}
                                </div>
                            </TableCell>
                            <TableCell>{format(new Date(file.uploadedAt), 'PPp')}</TableCell>
                            <TableCell className="text-right">
                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon">
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                                </a>
                                <Button variant="ghost" size="icon" onClick={() => onFileDelete(file.fullPath)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                            No files found. Upload one to get started!
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
    );
}
