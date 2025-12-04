import * as documentService from './documentService';
import * as summaryService from './summaryService';
import * as extractedDataService from './extractedDataService';
import * as categoryService from './categoryService';
import * as aiService from './aiService';
import { downloadDocumentToBucket, getBucketFilePath, deleteLocalFile } from '../utils/fileUtils';
import { ProcessingResult, ProcessingSummary } from 'src/models/processingInterface';

/**
 * Service layer for document processing operations
 * Handles the orchestration of the document processing pipeline
 */

/**
 * Processes a single document through the AI analysis pipeline
 * @param doc Document to process
 * @returns Processing result with success status
 */
export const processDocument = async (doc: {
    id: number;
    storage_path: string;
    title: string;
}): Promise<ProcessingResult> => {
    const hasSummary = await summaryService.hasSummary(doc.id);
    const hasExtractedData = await extractedDataService.hasExtractedData(doc.id);
    const hasCategory = await categoryService.hasCategory(doc.id);
    const needsProcessing = !hasSummary || !hasExtractedData;

    const result: ProcessingResult = {
        documentId: doc.id,
        hasSummary,
        hasExtractedData,
        hasCategory,
        needsProcessing,
        success: false
    };

    if (!needsProcessing) {
        result.success = true;
        return result;
    }

    let localFilePath: string | null = null;

    try {
        // Pass the title to generate a meaningful filename
        localFilePath = await downloadDocumentToBucket(doc.storage_path, doc.id, doc.title);

        const bucketFilePath = getBucketFilePath(localFilePath);

        const analysisResults = await aiService.callAIServiceForAnalysis(bucketFilePath, doc.id);
        console.log(`[Document ${doc.id}] IA service responded successfully`);

        // Create summary if needed
        if (!hasSummary && analysisResults.summary) {
            await summaryService.createSummary({
                document_id: doc.id,
                textual_summary: analysisResults.summary.textual_summary,
                date_analysis: new Date(),
                confidence_score: analysisResults.summary.confidence_score,
            });
            console.log(`[Document ${doc.id}] Summary created successfully`);
        }

        // Create extracted data if needed
        if (!hasExtractedData && analysisResults.extracted_data && analysisResults.extracted_data.length > 0) {
            const extractedDataEntries = analysisResults.extracted_data.map(data => {
                // Clean page value: convert to number or null
                let pageValue: number | null = null;
                if (typeof data.page === 'number') {
                    pageValue = data.page;
                } else if (typeof data.page === 'string') {
                    const parsed = parseInt(data.page, 10);
                    if (!isNaN(parsed)) {
                        pageValue = parsed;
                    }
                    // If it's "unknown" or any non-numeric string, leave as null
                }
        
                return {
                    document_id: doc.id,
                    key: data.key,
                    value: String(data.value),
                    unit: data.unit || null,
                    page: pageValue,
                    confidence_score: data.confidence_score,
                    chart_type: data.chart_type || null,
                    indicator_category: data.indicator_category || 'other'
                };
            });
        
            await extractedDataService.createExtractedData(extractedDataEntries);
            console.log(`[Document ${doc.id}] Extracted data created successfully`);
        }

        // Create category if needed 
        if (!hasCategory && analysisResults.category) {
            const category = await categoryService.getCategoryByName(analysisResults.category.name);
            const categoryId = category ? category.id : null;
            await documentService.updateDocumentCategory(doc.id, categoryId);
            if (categoryId) {
                console.log(`[Document ${doc.id}] Category assigned: ${analysisResults.category.name}`);
            }
        }

        result.success = true;
        result.hasSummary = true;
        result.hasExtractedData = true;
        result.hasCategory = true;
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.error = errorMessage;
        console.error(`[Document ${doc.id}] ❌ Error during processing:`, errorMessage);
    } finally {
        if (localFilePath) {
            try {

                await deleteLocalFile(localFilePath);
                console.log(`[Document ${doc.id}] Temporary file kept for ingestion`);
            } catch (cleanupError) {
                console.warn(`[Document ${doc.id}] Warning: Could not delete temporary file:`, cleanupError);
            }
        }
    }
    return result;
};

/**
 * Processes all pending documents
 * @returns Summary of processing results
 */
export const processPendingDocuments = async (): Promise<ProcessingSummary> => {
    console.log('🔍 Finding documents that need processing...');

    // Find documents that need processing
    const unanalyzedDocuments = await documentService.getUnanalyzedDocuments();
    console.log(`📋 Found ${unanalyzedDocuments.length} document(s) to process`);

    const results: ProcessingResult[] = [];
    let processed = 0;
    let failed = 0;

    for (const doc of unanalyzedDocuments) {
        console.log(`\n📄 Processing document ${doc.id}...`);
        const result = await processDocument(doc);
        results.push(result);
    
        if (result.success) {
            processed++;
            console.log(`✅ Document ${doc.id} processed successfully`);
            // Wait 5 seconds between successful documents to let Ollama clear VRAM
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (result.needsProcessing && !result.success) {
            failed++;
            console.log(`❌ Document ${doc.id} failed`);
            // Wait 10 seconds after failures to let Ollama recover
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    const alreadyProcessed = results.filter(r => !r.needsProcessing).length;
    const needsProcessing = results.filter(r => r.needsProcessing).length;

    return {
        totalFound: unanalyzedDocuments.length,
        alreadyProcessed,
        needsProcessing,
        processed,
        failed,
        documents: results
    };
};