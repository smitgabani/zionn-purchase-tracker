          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {selectionMode && selectedPurchases.size > 0 && (
                <DropdownMenuItem onClick={handleExportSelected}>
                  Export Selected ({selectedPurchases.size})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleExportFiltered}>
                Export Filtered ({filteredPurchases.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAll}>
                Export All ({purchases.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
