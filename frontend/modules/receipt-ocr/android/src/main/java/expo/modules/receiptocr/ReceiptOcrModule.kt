package expo.modules.receiptocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Lecture d'une photo de ticket sur l'appareil. Renvoie chaque ligne lue avec sa position,
// pour reconstituer les lignes du ticket (libelle a gauche, montant a droite) cote JavaScript.
class ReceiptOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReceiptOcr")

    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject(CodedException("NO_CONTEXT", "Application non prete", null))
        return@AsyncFunction
      }
      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri)) // applique l'orientation EXIF de la photo
      } catch (e: Exception) {
        promise.reject(CodedException("IMAGE_ERROR", e.message ?: "Image illisible", e))
        return@AsyncFunction
      }
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      recognizer.process(image)
        .addOnSuccessListener { text ->
          val lines = text.textBlocks.flatMap { block ->
            block.lines.map { line ->
              val box = line.boundingBox
              mapOf(
                "text" to line.text,
                "left" to (box?.left ?: 0),
                "top" to (box?.top ?: 0),
                "bottom" to (box?.bottom ?: 0)
              )
            }
          }
          recognizer.close()
          promise.resolve(lines)
        }
        .addOnFailureListener { e ->
          recognizer.close()
          promise.reject(CodedException("OCR_ERROR", e.message ?: "Lecture impossible", e))
        }
    }
  }
}
