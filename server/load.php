<?
	/* The job of this file/script is to receive the GAMEMAPS
	 * file from the JavaScript program and prepare it to
	 * be fetched by Dropbox. Once that happens, the file
	 * will be purged from disk. echo.php would be used
	 * instead, but the URL gets way too long. */
	 
	 // Calm down the Same Origin Policy
	 header("Access-Control-Allow-Origin: *");
	 
	 // Decode the data, from POST information
	 $binaryVal = base64_decode($_POST["data"], true);
	 if ($binaryVal === false) exit;
	 
	 // Jam it into a file with a unique name generated from JavaScript
	 $id = "OpenThar_" . $_GET["id"] . ".dat";
	 $file = fopen($id, "wb");
	 fwrite($file, $binaryVal);
	 fclose($file);
	 
	 // TODO: purge old unused entries
	 exit;
?>